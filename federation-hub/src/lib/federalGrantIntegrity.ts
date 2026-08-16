import { randomUUID } from 'node:crypto'
import type { DataSource, EntityManager } from 'typeorm'
import type { SsoUser } from './ssoSession'
import {
  assertClubInFederalScope,
  assertFederalOperationScope,
  type FederalOperationAuditContext,
  FederalOperationInputError,
  recordFederalOperationAudit,
  requireAmount,
  requireEnum,
} from './federalOperationsCommon'
import { FederalOperationWorkflowError } from './federalOperationsRules'

const APPLICATION_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'PAID', 'CLOSED'] as const
const PAYMENT_STATUSES = ['PLANNED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED'] as const

const TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'],
  APPROVED: ['PAID', 'CLOSED'],
  PARTIALLY_APPROVED: ['PAID', 'CLOSED'],
  REJECTED: ['CLOSED'],
  PAID: ['CLOSED'],
  CLOSED: [],
}

type GrantApplicationRow = {
  id: string
  grant_id: string
  club_id: string
  status: string
  requested_amount: number | string
  approved_amount: number | string | null
  federation_id: string
  league_id: string | null
  total_budget: number | string
  currency: string
}

async function loadLockedApplication(manager: EntityManager, session: SsoUser, id: string): Promise<GrantApplicationRow> {
  const rows = await manager.query(
    `SELECT a.id, a.grant_id, a.club_id, a.status, a.requested_amount, a.approved_amount,
            g.federation_id, g.league_id, g.total_budget, g.currency
       FROM grant_applications a
       JOIN federation_grants g ON g.id = a.grant_id
      WHERE a.id = ?
      FOR UPDATE`,
    [id],
  ) as GrantApplicationRow[]
  const row = rows[0]
  if (!row) throw new FederalOperationInputError('Demande de subvention introuvable')
  assertFederalOperationScope(session, row.federation_id, row.league_id)
  await assertClubInFederalScope(manager, row.federation_id, row.league_id, row.club_id)
  return row
}

export async function transitionGrantApplicationSafely(
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  id: string,
  targetStatus: unknown,
  approvedAmount?: unknown,
  comment?: string | null,
) {
  return source.transaction(async manager => {
    const row = await loadLockedApplication(manager, session, id)
    const to = requireEnum(targetStatus, APPLICATION_STATUSES, 'Statut demande')
    if (!TRANSITIONS[row.status]?.includes(to)) throw new FederalOperationWorkflowError(`Transition de demande interdite : ${row.status} -> ${to}`)

    let approved = row.approved_amount == null ? null : Number(row.approved_amount)
    if (to === 'APPROVED' || to === 'PARTIALLY_APPROVED') {
      approved = requireAmount(approvedAmount, 'Montant approuvé')
      if (approved > Number(row.requested_amount) + 0.001) {
        throw new FederalOperationWorkflowError('Le montant approuvé ne peut pas dépasser le montant demandé')
      }
      const sums = await manager.query(
        `SELECT COALESCE(SUM(approved_amount), 0) AS total
           FROM grant_applications
          WHERE grant_id = ? AND id <> ? AND approved_amount IS NOT NULL
            AND status NOT IN ('REJECTED')`,
        [row.grant_id, id],
      ) as Array<{ total: number | string }>
      if (Number(sums[0]?.total ?? 0) + approved > Number(row.total_budget) + 0.001) {
        throw new FederalOperationWorkflowError('Le budget total de la campagne serait dépassé')
      }
    }

    await manager.query(
      `UPDATE grant_applications
          SET status = ?, approved_amount = ?,
              submitted_at = CASE WHEN ? = 'SUBMITTED' THEN CURRENT_TIMESTAMP ELSE submitted_at END,
              reviewed_at = CASE WHEN ? IN ('APPROVED','PARTIALLY_APPROVED','REJECTED') THEN CURRENT_TIMESTAMP ELSE reviewed_at END,
              reviewed_by = CASE WHEN ? IN ('APPROVED','PARTIALLY_APPROVED','REJECTED') THEN ? ELSE reviewed_by END,
              review_comment = CASE WHEN ? IN ('APPROVED','PARTIALLY_APPROVED','REJECTED') THEN ? ELSE review_comment END
        WHERE id = ?`,
      [to, approved, to, to, to, audit.userId, to, comment ?? null, id],
    )
    await recordFederalOperationAudit(manager, audit, 'GRANT_APPLICATION', id, 'STATUS_CHANGED', { status: row.status }, { status: to, approvedAmount: approved }, comment)
    return { id, status: to, approvedAmount: approved }
  })
}

export async function recordGrantPaymentSafely(
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  applicationId: string,
  input: Record<string, unknown>,
) {
  return source.transaction(async manager => {
    const application = await loadLockedApplication(manager, session, applicationId)
    if (!['APPROVED', 'PARTIALLY_APPROVED', 'PAID'].includes(application.status)) {
      throw new FederalOperationWorkflowError('La demande doit être approuvée avant paiement')
    }
    const amount = requireAmount(input.amount, 'Montant du paiement')
    const status = requireEnum(input.status ?? 'PLANNED', PAYMENT_STATUSES, 'Statut paiement')
    const paidRows = await manager.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
         FROM grant_payments
        WHERE application_id = ? AND status = 'PAID'
        FOR UPDATE`,
      [applicationId],
    ) as Array<{ total: number | string }>
    const paidTotal = Number(paidRows[0]?.total ?? 0)
    const approvedAmount = Number(application.approved_amount ?? 0)
    if (status === 'PAID' && paidTotal + amount > approvedAmount + 0.001) {
      throw new FederalOperationWorkflowError('Le cumul des paiements dépasse le montant approuvé')
    }
    const id = randomUUID()
    const reference = typeof input.paymentReference === 'string' && input.paymentReference.trim()
      ? input.paymentReference.trim().slice(0, 191)
      : null
    const currency = typeof input.currency === 'string' && input.currency.trim()
      ? input.currency.trim().slice(0, 3).toUpperCase()
      : application.currency
    await manager.query(
      `INSERT INTO grant_payments (id, application_id, amount, currency, payment_reference, status, paid_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, applicationId, amount, currency, reference, status, status === 'PAID' ? new Date() : null, audit.userId],
    )
    await recordFederalOperationAudit(manager, audit, 'GRANT_PAYMENT', id, 'RECORDED', null, { applicationId, amount, status, paymentReference: reference })
    return { id, applicationId, amount, status }
  })
}
