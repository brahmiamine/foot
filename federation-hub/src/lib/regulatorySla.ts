import type { DataSource } from 'typeorm'
import {
  buildWorkflowSlaEventId,
  computeWorkflowSlaSchedule,
  resolveWorkflowSlaState,
  type WorkflowSlaAlertStage,
  type WorkflowSlaState,
} from '../../../packages/domain-contracts/src/workflow-sla'
import {
  deliverNotification,
  type NotifyPayload,
} from '../../../packages/notifications-client/src/index'
import type { SsoUser } from './ssoSession'
import {
  assertFederalOperationScope,
  buildFederalOperationScopeFilter,
  newFederalOperationId,
  recordFederalOperationAudit,
  requireEnum,
  type FederalOperationAuditContext,
  type FederalOperationSource,
} from './federalOperationsCommon'
import { FederalOperationWorkflowError } from './federalOperationsRules'

export const REGULATORY_SLA_DOMAINS = ['CLUB_LICENSE', 'COMPETITION_ENTRY', 'DISCIPLINE', 'APPEAL', 'INSURANCE', 'GRANT', 'DOCUMENT_COMPLIANCE'] as const
export type RegulatorySlaDomain = (typeof REGULATORY_SLA_DOMAINS)[number]
export type RegulatorySlaState = WorkflowSlaState

export interface RegulatorySlaThresholds {
  warnAfterHours: number
  overdueAfterHours: number
  escalationAfterHours: number
}

/** Comportement historique conservé pour warn/overdue ; l'escalade ajoute par défaut 24 h après l'échéance. */
export const DEFAULT_SLA_HOURS: Record<RegulatorySlaDomain, RegulatorySlaThresholds> = {
  CLUB_LICENSE: { warnAfterHours: 72, overdueAfterHours: 168, escalationAfterHours: 192 },
  COMPETITION_ENTRY: { warnAfterHours: 72, overdueAfterHours: 168, escalationAfterHours: 192 },
  DISCIPLINE: { warnAfterHours: 48, overdueAfterHours: 120, escalationAfterHours: 144 },
  APPEAL: { warnAfterHours: 48, overdueAfterHours: 120, escalationAfterHours: 144 },
  INSURANCE: { warnAfterHours: 72, overdueAfterHours: 168, escalationAfterHours: 192 },
  GRANT: { warnAfterHours: 72, overdueAfterHours: 240, escalationAfterHours: 264 },
  DOCUMENT_COMPLIANCE: { warnAfterHours: 72, overdueAfterHours: 168, escalationAfterHours: 192 },
}

export interface RegulatorySlaQueueItem {
  domain: RegulatorySlaDomain
  entityId: string
  label: string
  federationId: string
  leagueId: string | null
  pendingSince: Date | string
  hoursPending: number
  state: RegulatorySlaState
  reminderAt: Date
  dueAt: Date
  escalationAt: Date
  policyVersion: number
}

interface SlaPolicyRow {
  domain: RegulatorySlaDomain
  warn_after_hours: number
  overdue_after_hours: number
  escalation_after_hours: number | null
  version: number | null
}

function validateThresholds(warn: number, overdue: number, escalation: number): void {
  if (!Number.isInteger(warn) || warn < 1) {
    throw new FederalOperationWorkflowError("Le délai d'alerte SLA doit être un entier positif")
  }
  if (!Number.isInteger(overdue) || overdue <= warn) {
    throw new FederalOperationWorkflowError("Le délai de dépassement SLA doit être un entier supérieur au délai d'alerte")
  }
  if (!Number.isInteger(escalation) || escalation <= overdue) {
    throw new FederalOperationWorkflowError("Le délai d'escalade SLA doit être un entier supérieur au délai de dépassement")
  }
}

function mapPolicy(domain: RegulatorySlaDomain, row?: SlaPolicyRow) {
  const defaults = DEFAULT_SLA_HOURS[domain]
  const warnAfterHours = row?.warn_after_hours ?? defaults.warnAfterHours
  const overdueAfterHours = row?.overdue_after_hours ?? defaults.overdueAfterHours
  const escalationAfterHours = row?.escalation_after_hours ?? (row ? overdueAfterHours + 24 : defaults.escalationAfterHours)
  return {
    domain,
    warnAfterHours,
    overdueAfterHours,
    escalationAfterHours,
    version: row?.version ?? 0,
    isDefault: !row,
  }
}

async function loadPolicies(source: FederalOperationSource, federationId: string) {
  const rows = await source.query(
    `SELECT domain, warn_after_hours, overdue_after_hours, escalation_after_hours, version
       FROM regulatory_sla_policies WHERE federation_id = ? ORDER BY domain`,
    [federationId],
  ) as SlaPolicyRow[]
  const byDomain = new Map(rows.map((row) => [row.domain, row]))
  return REGULATORY_SLA_DOMAINS.map((domain) => mapPolicy(domain, byDomain.get(domain)))
}

export async function listRegulatorySlaPolicies(source: FederalOperationSource, session: SsoUser, federationId: string) {
  assertFederalOperationScope(session, federationId)
  return loadPolicies(source, federationId)
}

export async function upsertRegulatorySlaPolicy(
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  federationId: string,
  domainInput: unknown,
  warnAfterHours: unknown,
  overdueAfterHours: unknown,
  escalationAfterHours?: unknown,
) {
  assertFederalOperationScope(session, federationId)
  const domain = requireEnum(domainInput, REGULATORY_SLA_DOMAINS, 'Domaine SLA')
  const warn = Number(warnAfterHours)
  const overdue = Number(overdueAfterHours)
  const escalation = escalationAfterHours == null || escalationAfterHours === ''
    ? overdue + 24
    : Number(escalationAfterHours)
  validateThresholds(warn, overdue, escalation)
  await source.transaction(async (manager) => {
    await manager.query(
      `INSERT INTO regulatory_sla_policies
        (id, federation_id, domain, warn_after_hours, overdue_after_hours, escalation_after_hours, version, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE
         warn_after_hours = VALUES(warn_after_hours),
         overdue_after_hours = VALUES(overdue_after_hours),
         escalation_after_hours = VALUES(escalation_after_hours),
         version = version + 1,
         updated_by = VALUES(updated_by)`,
      [newFederalOperationId(), federationId, domain, warn, overdue, escalation, audit.userId],
    )
    await recordFederalOperationAudit(
      manager,
      audit,
      'REGULATORY_SLA_POLICY',
      `${federationId}:${domain}`,
      'UPSERTED',
      null,
      { domain, warnAfterHours: warn, overdueAfterHours: overdue, escalationAfterHours: escalation },
    )
  })
  return { domain, warnAfterHours: warn, overdueAfterHours: overdue, escalationAfterHours: escalation }
}

type PendingRow = { entity_id: string; label: string; federation_id: string; league_id: string | null; pending_since: Date | string; hours_pending: number | string }

async function queryPending(source: FederalOperationSource, sql: string, params: unknown[]): Promise<PendingRow[]> {
  return source.query(sql, params) as Promise<PendingRow[]>
}

const PENDING_QUERIES: Record<RegulatorySlaDomain, (scope: { sql: string; params: unknown[] }) => { sql: string; params: unknown[] }> = {
  CLUB_LICENSE: (scope) => ({
    sql: `SELECT id AS entity_id, code AS label, federation_id, league_id, COALESCE(review_started_at, submitted_at, created_at) AS pending_since,
                 TIMESTAMPDIFF(HOUR, COALESCE(review_started_at, submitted_at, created_at), NOW()) AS hours_pending
            FROM club_license_applications WHERE status IN ('SUBMITTED','UNDER_REVIEW') AND ${scope.sql}`,
    params: scope.params,
  }),
  COMPETITION_ENTRY: (scope) => ({
    sql: `SELECT id AS entity_id, id AS label, federation_id, league_id, updated_at AS pending_since,
                 TIMESTAMPDIFF(HOUR, updated_at, NOW()) AS hours_pending
            FROM competition_registrations WHERE status = 'UNDER_REVIEW' AND ${scope.sql}`,
    params: scope.params,
  }),
  DISCIPLINE: (scope) => ({
    sql: `SELECT id AS entity_id, case_number AS label, federation_id, league_id, opened_at AS pending_since,
                 TIMESTAMPDIFF(HOUR, opened_at, NOW()) AS hours_pending
            FROM disciplinary_cases WHERE status IN ('OPEN','UNDER_REVIEW','HEARING_SCHEDULED') AND ${scope.sql}`,
    params: scope.params,
  }),
  APPEAL: (scope) => ({
    sql: `SELECT id AS entity_id, id AS label, federation_id, league_id, submitted_at AS pending_since,
                 TIMESTAMPDIFF(HOUR, submitted_at, NOW()) AS hours_pending
            FROM appeals WHERE status IN ('SUBMITTED','ADMISSIBILITY_REVIEW','UNDER_REVIEW') AND ${scope.sql}`,
    params: scope.params,
  }),
  INSURANCE: (scope) => ({
    sql: `SELECT id AS entity_id, policy_number AS label, federation_id, league_id, submitted_at AS pending_since,
                 TIMESTAMPDIFF(HOUR, submitted_at, NOW()) AS hours_pending
            FROM club_insurance_policies WHERE status IN ('SUBMITTED','UNDER_REVIEW') AND submitted_at IS NOT NULL AND ${scope.sql}
           UNION ALL
          SELECT id AS entity_id, policy_number AS label, federation_id, league_id, submitted_at AS pending_since,
                 TIMESTAMPDIFF(HOUR, submitted_at, NOW()) AS hours_pending
            FROM person_insurance_policies WHERE status IN ('SUBMITTED','UNDER_REVIEW') AND submitted_at IS NOT NULL AND ${scope.sql}`,
    params: [...scope.params, ...scope.params],
  }),
  GRANT: (scope) => ({
    sql: `SELECT a.id AS entity_id, a.id AS label, g.federation_id, g.league_id, a.submitted_at AS pending_since,
                 TIMESTAMPDIFF(HOUR, a.submitted_at, NOW()) AS hours_pending
            FROM grant_applications a JOIN federation_grants g ON g.id = a.grant_id
           WHERE a.status IN ('SUBMITTED','UNDER_REVIEW') AND a.submitted_at IS NOT NULL AND ${scope.sql}`,
    params: scope.params,
  }),
  DOCUMENT_COMPLIANCE: (scope) => ({
    sql: `SELECT s.id AS entity_id, r.code AS label, r.federation_id, r.league_id, s.submitted_at AS pending_since,
                 TIMESTAMPDIFF(HOUR, s.submitted_at, NOW()) AS hours_pending
            FROM regulatory_document_submissions s JOIN regulatory_document_requirements r ON r.id = s.requirement_id
           WHERE s.status = 'UNDER_REVIEW' AND ${scope.sql}`,
    params: scope.params,
  }),
}

function queueScopeForFederation(federationId: string) {
  return { sql: 'federation_id = ?', params: [federationId] as unknown[] }
}

async function buildQueue(
  source: FederalOperationSource,
  federationId: string,
  scope: { sql: string; params: unknown[] },
  at: Date,
): Promise<RegulatorySlaQueueItem[]> {
  const policies = await loadPolicies(source, federationId)
  const thresholds = new Map(policies.map((policy) => [policy.domain, policy]))
  const items: RegulatorySlaQueueItem[] = []
  for (const domain of REGULATORY_SLA_DOMAINS) {
    const threshold = thresholds.get(domain)!
    const { sql, params } = PENDING_QUERIES[domain](scope)
    const rows = await queryPending(source, sql, params)
    for (const row of rows) {
      const startedAt = new Date(row.pending_since)
      const schedule = computeWorkflowSlaSchedule(startedAt, {
        reminderAfterMinutes: threshold.warnAfterHours * 60,
        dueAfterMinutes: threshold.overdueAfterHours * 60,
        escalationAfterMinutes: threshold.escalationAfterHours * 60,
      })
      items.push({
        domain,
        entityId: row.entity_id,
        label: row.label,
        federationId: row.federation_id,
        leagueId: row.league_id,
        pendingSince: row.pending_since,
        hoursPending: Number(row.hours_pending),
        state: resolveWorkflowSlaState(schedule, at),
        reminderAt: schedule.reminderAt,
        dueAt: schedule.dueAt,
        escalationAt: schedule.escalationAt,
        policyVersion: threshold.version,
      })
    }
  }
  return items
}

/** FED-010/GOV-008 : file avec états communs IN_SLA/DUE_SOON/OVERDUE/ESCALATION_DUE. */
export async function getRegulatorySlaOverdueQueue(source: FederalOperationSource, session: SsoUser, federationId: string): Promise<RegulatorySlaQueueItem[]> {
  assertFederalOperationScope(session, federationId)
  const items = await buildQueue(source, federationId, buildFederalOperationScopeFilter(session), new Date())
  return items
    .filter((item) => item.state !== 'IN_SLA')
    .sort((left, right) => right.hoursPending - left.hoursPending)
}

async function resolveAlertRecipients(
  source: FederalOperationSource,
  item: RegulatorySlaQueueItem,
  stage: WorkflowSlaAlertStage,
): Promise<string[]> {
  const params: unknown[] = [item.federationId]
  let leagueClause = ''
  if (item.leagueId) {
    leagueClause = ` OR (role = 'LEAGUE_ADMIN' AND league_id = ?)`
    params.push(item.leagueId)
  }
  const platformClause = stage === 'ESCALATION'
    ? ` OR role IN ('SUPERADMIN','PLATFORM_SUPERADMIN')`
    : ''
  const rows = await source.query(
    `SELECT id FROM User
      WHERE isActive = 1 AND (
        (role = 'FEDERATION_ADMIN' AND federation_id = ?)
        ${leagueClause}
        ${platformClause}
      )`,
    params,
  ) as Array<{ id: string }>
  return [...new Set(rows.map((row) => row.id))]
}

function stageForState(state: RegulatorySlaState): WorkflowSlaAlertStage | null {
  if (state === 'DUE_SOON' || state === 'OVERDUE') return 'REMINDER'
  if (state === 'ESCALATION_DUE') return 'ESCALATION'
  return null
}

async function claimAlertEvent(
  source: DataSource,
  item: RegulatorySlaQueueItem,
  stage: WorkflowSlaAlertStage,
): Promise<{ claimed: boolean; eventId: string }> {
  const cycleStartedAt = new Date(item.pendingSince)
  const eventId = buildWorkflowSlaEventId({
    domain: `REGULATORY:${item.domain}`,
    entityId: item.entityId,
    stage,
    cycleStartedAt,
    policyVersion: item.policyVersion,
  })
  const claimed = await source.transaction(async (manager) => {
    await manager.query(
      `INSERT IGNORE INTO regulatory_sla_alert_events
        (id, event_id, federation_id, league_id, domain, entity_id, stage, cycle_started_at, policy_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newFederalOperationId(),
        eventId,
        item.federationId,
        item.leagueId,
        item.domain,
        item.entityId,
        stage,
        cycleStartedAt,
        item.policyVersion || null,
      ],
    )
    const result = await manager.query(
      `UPDATE regulatory_sla_alert_events
          SET status = 'PROCESSING', locked_at = NOW(), attempts = attempts + 1, last_error = NULL
        WHERE event_id = ?
          AND (status = 'PENDING' OR (status = 'PROCESSING' AND locked_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)))`,
      [eventId],
    ) as { affectedRows?: number }
    return Number(result?.affectedRows ?? 0) === 1
  })
  return { claimed, eventId }
}

async function completeAlert(
  source: FederalOperationSource,
  eventId: string,
  error?: unknown,
): Promise<void> {
  if (!error) {
    await source.query(
      `UPDATE regulatory_sla_alert_events
          SET status = 'SENT', sent_at = NOW(), locked_at = NULL, last_error = NULL
        WHERE event_id = ? AND status = 'PROCESSING'`,
      [eventId],
    )
    return
  }
  const message = error instanceof Error ? error.message : String(error)
  await source.query(
    `UPDATE regulatory_sla_alert_events
        SET status = 'PENDING', locked_at = NULL, last_error = ?
      WHERE event_id = ? AND status = 'PROCESSING'`,
    [message.slice(0, 2000), eventId],
  )
}

export interface RegulatorySlaProcessingResult {
  examined: number
  claimed: number
  sent: number
  retriableFailures: number
  skippedWithoutRecipients: number
}

/**
 * GOV-008 : processeur idempotent. La clé stable protège des exécutions
 * concurrentes ; un échec Notifications remet l'événement en PENDING pour
 * permettre un prochain retry. L'escalade ajoute les superadmins plateforme.
 */
export async function processRegulatorySlaAlerts(
  source: DataSource,
  federationId: string,
  at: Date = new Date(),
  deliver: (payload: NotifyPayload) => Promise<unknown> = deliverNotification,
): Promise<RegulatorySlaProcessingResult> {
  const queue = await buildQueue(source, federationId, queueScopeForFederation(federationId), at)
  const result: RegulatorySlaProcessingResult = {
    examined: queue.length,
    claimed: 0,
    sent: 0,
    retriableFailures: 0,
    skippedWithoutRecipients: 0,
  }
  for (const item of queue) {
    const stage = stageForState(item.state)
    if (!stage) continue
    const recipients = await resolveAlertRecipients(source, item, stage)
    if (!recipients.length) {
      result.skippedWithoutRecipients += 1
      continue
    }
    const claim = await claimAlertEvent(source, item, stage)
    if (!claim.claimed) continue
    result.claimed += 1
    try {
      await deliver({
        eventId: claim.eventId,
        type: stage === 'REMINDER' ? 'REGULATORY_SLA_REMINDER' : 'REGULATORY_SLA_ESCALATION',
        category: 'REGULATORY_SLA',
        target: { type: 'USER', userIds: recipients },
        title: stage === 'REMINDER' ? 'Dossier réglementaire à traiter' : 'Escalade SLA réglementaire',
        body: `${item.domain} · ${item.label} · en attente depuis ${item.hoursPending} h`,
        data: {
          domain: item.domain,
          entityId: item.entityId,
          federationId: item.federationId,
          leagueId: item.leagueId,
          state: item.state,
          pendingSince: new Date(item.pendingSince).toISOString(),
          dueAt: item.dueAt.toISOString(),
          escalationAt: item.escalationAt.toISOString(),
          policyVersion: item.policyVersion,
        },
      })
      await completeAlert(source, claim.eventId)
      result.sent += 1
    } catch (error) {
      await completeAlert(source, claim.eventId, error)
      result.retriableFailures += 1
    }
  }
  return result
}
