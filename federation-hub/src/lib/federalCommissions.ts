import type { DataSource, EntityManager } from 'typeorm'
import type { SsoUser } from './ssoSession'
import {
  assertFederalOperationScope,
  buildFederalOperationScopeFilter,
  type FederalOperationAuditContext,
  type FederalOperationSource,
  loadScopedRow,
  newFederalOperationId,
  optionalString,
  recordFederalOperationAudit,
  requireEnum,
  requireString,
} from './federalOperationsCommon'
import {
  assertCommissionDecisionAllowed,
  assertCommissionSessionTransition,
  assertDecisionMutable,
  calculateRequiredQuorum,
  type CommissionQuorumRule,
  type CommissionSessionStatus,
  FederalOperationWorkflowError,
} from './federalOperationsRules'

const COMMISSION_TYPES = ['DISCIPLINE', 'APPEALS', 'LEGAL_DISPUTES', 'CLUB_LICENSING', 'FINANCIAL_CONTROL', 'COMPETITIONS', 'OTHER'] as const
const QUORUM_RULES = ['ABSOLUTE_MAJORITY', 'TWO_THIRDS', 'FIXED'] as const
const MEMBER_ROLES = ['PRESIDENT', 'VICE_PRESIDENT', 'RAPPORTEUR', 'MEMBER', 'SECRETARY'] as const
const ATTENDANCE_STATUSES = ['INVITED', 'PRESENT', 'ABSENT', 'EXCUSED'] as const
const SESSION_STATUSES = ['DRAFT', 'CONVENED', 'IN_SESSION', 'DELIBERATION', 'CLOSED', 'CANCELLED'] as const
const SOURCE_TYPES = ['LEGAL_CASE', 'DISCIPLINARY_CASE', 'APPEAL', 'CLUB_LICENSE', 'FINANCIAL_COMPLIANCE', 'COMPETITION', 'OTHER'] as const

type TransactionSource = DataSource | EntityManager

type CommissionRow = {
  id: string
  federation_id: string
  league_id: string | null
  code: string
  name: string
  commission_type: string
  status: string
  quorum_rule: CommissionQuorumRule
  fixed_quorum: number | null
}

type SessionScopeRow = {
  id: string
  commission_id: string
  status: CommissionSessionStatus
  quorum_met: number | boolean
  required_quorum: number
  present_voters: number
  federation_id: string
  league_id: string | null
}

type DecisionScopeRow = {
  id: string
  session_id: string
  commission_id: string
  signed_at: Date | string | null
  federation_id: string
  league_id: string | null
}

async function loadSession(source: FederalOperationSource, session: SsoUser, id: string): Promise<SessionScopeRow> {
  const rows = await source.query(
    `SELECT s.*, c.federation_id, c.league_id
       FROM federal_commission_sessions s
       JOIN federal_commissions c ON c.id = s.commission_id
      WHERE s.id = ? LIMIT 1`,
    [id],
  ) as SessionScopeRow[]
  const row = rows[0]
  if (!row) throw new Error('Séance introuvable')
  assertFederalOperationScope(session, row.federation_id, row.league_id)
  return row
}

async function loadDecision(source: FederalOperationSource, session: SsoUser, id: string): Promise<DecisionScopeRow> {
  const rows = await source.query(
    `SELECT d.*, c.federation_id, c.league_id
       FROM federal_commission_decisions d
       JOIN federal_commissions c ON c.id = d.commission_id
      WHERE d.id = ? LIMIT 1`,
    [id],
  ) as DecisionScopeRow[]
  const row = rows[0]
  if (!row) throw new Error('Décision introuvable')
  assertFederalOperationScope(session, row.federation_id, row.league_id)
  return row
}

export async function listFederalCommissions(source: FederalOperationSource, session: SsoUser) {
  const scope = buildFederalOperationScopeFilter(session)
  return source.query(
    `SELECT c.*,
            (SELECT COUNT(*) FROM federal_commission_members m WHERE m.commission_id = c.id AND m.active = 1) AS active_members,
            (SELECT COUNT(*) FROM federal_commission_sessions s WHERE s.commission_id = c.id AND s.status NOT IN ('CLOSED','CANCELLED')) AS open_sessions
       FROM federal_commissions c
      WHERE ${scope.sql}
      ORDER BY c.created_at DESC`,
    scope.params,
  )
}

export async function createFederalCommission(
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  input: Record<string, unknown>,
) {
  const federationId = requireString(input.federationId, 'Fédération')
  const leagueId = optionalString(input.leagueId)
  assertFederalOperationScope(session, federationId, leagueId)
  const code = requireString(input.code, 'Code', 80).toUpperCase()
  const name = requireString(input.name, 'Nom')
  const commissionType = requireEnum(input.commissionType, COMMISSION_TYPES, 'Type de commission')
  const quorumRule = requireEnum(input.quorumRule ?? 'ABSOLUTE_MAJORITY', QUORUM_RULES, 'Règle de quorum')
  const fixedQuorum = input.fixedQuorum == null ? null : Number(input.fixedQuorum)
  if (quorumRule === 'FIXED' && (!Number.isInteger(fixedQuorum) || !fixedQuorum || fixedQuorum < 1)) {
    throw new FederalOperationWorkflowError('Un quorum fixe positif est requis')
  }
  const id = newFederalOperationId()
  const created = { id, federationId, leagueId, code, name, commissionType, quorumRule, fixedQuorum }
  await source.transaction(async manager => {
    await manager.query(
      `INSERT INTO federal_commissions
        (id, federation_id, league_id, code, name, commission_type, quorum_rule, fixed_quorum, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, federationId, leagueId, code, name, commissionType, quorumRule, fixedQuorum, audit.userId],
    )
    await recordFederalOperationAudit(manager, audit, 'COMMISSION', id, 'CREATED', null, created)
  })
  return created
}

export async function addFederalCommissionMember(
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  commissionId: string,
  input: Record<string, unknown>,
) {
  const commission = await loadScopedRow<CommissionRow>(source, session, 'federal_commissions', commissionId)
  const userId = requireString(input.userId, 'Utilisateur')
  const memberRole = requireEnum(input.memberRole ?? 'MEMBER', MEMBER_ROLES, 'Rôle de commission')
  const voting = input.voting !== false
  const id = newFederalOperationId()
  await source.transaction(async manager => {
    await manager.query(
      `INSERT INTO federal_commission_members
        (id, commission_id, user_id, member_role, voting, active, created_by)
       VALUES (?, ?, ?, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE member_role = VALUES(member_role), voting = VALUES(voting), active = 1, ended_at = NULL`,
      [id, commission.id, userId, memberRole, voting ? 1 : 0, audit.userId],
    )
    await recordFederalOperationAudit(manager, audit, 'COMMISSION', commission.id, 'MEMBER_UPSERTED', null, { userId, memberRole, voting })
  })
  return { commissionId, userId, memberRole, voting }
}

export async function createFederalCommissionSession(
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  commissionId: string,
  input: Record<string, unknown>,
) {
  const commission = await loadScopedRow<CommissionRow>(source, session, 'federal_commissions', commissionId)
  if (commission.status !== 'ACTIVE') throw new FederalOperationWorkflowError('La commission doit être active')
  const members = await source.query(
    `SELECT id, voting FROM federal_commission_members WHERE commission_id = ? AND active = 1 ORDER BY appointed_at`,
    [commissionId],
  ) as Array<{ id: string; voting: number | boolean }>
  const votingMembers = members.filter(member => Boolean(member.voting)).length
  const requiredQuorum = calculateRequiredQuorum(votingMembers, commission.quorum_rule, commission.fixed_quorum)
  const title = requireString(input.title, 'Objet de la séance')
  const scheduledAt = new Date(requireString(input.scheduledAt, 'Date de séance'))
  if (Number.isNaN(scheduledAt.getTime())) throw new Error('Date de séance invalide')
  const seasonId = optionalString(input.seasonId)
  const agenda = Array.isArray(input.agenda) ? input.agenda : []
  const id = newFederalOperationId()
  await source.transaction(async manager => {
    await manager.query(
      `INSERT INTO federal_commission_sessions
        (id, commission_id, season_id, title, scheduled_at, agenda, required_quorum, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, commissionId, seasonId, title, scheduledAt, JSON.stringify(agenda), requiredQuorum, audit.userId],
    )
    for (const member of members) {
      await manager.query(
        `INSERT INTO federal_commission_attendance (id, session_id, member_id, attendance_status, recorded_by)
         VALUES (?, ?, ?, 'INVITED', ?)`,
        [newFederalOperationId(), id, member.id, audit.userId],
      )
    }
    await recordFederalOperationAudit(manager, audit, 'COMMISSION_SESSION', id, 'CREATED', null, { commissionId, title, scheduledAt, requiredQuorum })
  })
  return { id, commissionId, title, scheduledAt, requiredQuorum, status: 'DRAFT' as const }
}

export async function recordFederalCommissionAttendance(
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  sessionId: string,
  memberId: string,
  attendanceStatus: unknown,
) {
  const sessionRow = await loadSession(source, session, sessionId)
  if (sessionRow.status === 'CLOSED' || sessionRow.status === 'CANCELLED') {
    throw new FederalOperationWorkflowError('La présence ne peut plus être modifiée sur cette séance')
  }
  const status = requireEnum(attendanceStatus, ATTENDANCE_STATUSES, 'Présence')
  await source.transaction(async manager => {
    const memberRows = await manager.query(
      `SELECT id FROM federal_commission_members WHERE id = ? AND commission_id = ? AND active = 1 LIMIT 1`,
      [memberId, sessionRow.commission_id],
    ) as Array<{ id: string }>
    if (!memberRows[0]) throw new Error('Membre de commission introuvable')
    await manager.query(
      `UPDATE federal_commission_attendance
          SET attendance_status = ?, checked_in_at = CASE WHEN ? = 'PRESENT' THEN CURRENT_TIMESTAMP ELSE NULL END, recorded_by = ?
        WHERE session_id = ? AND member_id = ?`,
      [status, status, audit.userId, sessionId, memberId],
    )
    const counts = await manager.query(
      `SELECT COUNT(*) AS present_voters
         FROM federal_commission_attendance a
         JOIN federal_commission_members m ON m.id = a.member_id
        WHERE a.session_id = ? AND a.attendance_status = 'PRESENT' AND m.active = 1 AND m.voting = 1`,
      [sessionId],
    ) as Array<{ present_voters: number | string }>
    const presentVoters = Number(counts[0]?.present_voters ?? 0)
    const quorumMet = presentVoters >= Number(sessionRow.required_quorum)
    await manager.query(
      `UPDATE federal_commission_sessions SET present_voters = ?, quorum_met = ? WHERE id = ?`,
      [presentVoters, quorumMet ? 1 : 0, sessionId],
    )
    await recordFederalOperationAudit(manager, audit, 'COMMISSION_SESSION', sessionId, 'ATTENDANCE_RECORDED', null, { memberId, status, presentVoters, quorumMet })
  })
  return { sessionId, memberId, status }
}

export async function transitionFederalCommissionSession(
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  sessionId: string,
  targetStatus: unknown,
  reason?: string | null,
) {
  const current = await loadSession(source, session, sessionId)
  const to = requireEnum(targetStatus, SESSION_STATUSES, 'Statut de séance')
  assertCommissionSessionTransition(current.status, to, Boolean(current.quorum_met))
  await source.transaction(async manager => {
    await manager.query(
      `UPDATE federal_commission_sessions
          SET status = ?,
              started_at = CASE WHEN ? = 'IN_SESSION' AND started_at IS NULL THEN CURRENT_TIMESTAMP ELSE started_at END,
              closed_at = CASE WHEN ? IN ('CLOSED','CANCELLED') THEN CURRENT_TIMESTAMP ELSE closed_at END
        WHERE id = ?`,
      [to, to, to, sessionId],
    )
    await recordFederalOperationAudit(manager, audit, 'COMMISSION_SESSION', sessionId, 'STATUS_CHANGED', { status: current.status }, { status: to }, reason)
  })
  return { id: sessionId, status: to }
}

export async function createFederalCommissionDecision(
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  sessionId: string,
  input: Record<string, unknown>,
) {
  const sessionRow = await loadSession(source, session, sessionId)
  assertCommissionDecisionAllowed(sessionRow.status, Boolean(sessionRow.quorum_met))
  const sourceType = requireEnum(input.sourceType, SOURCE_TYPES, 'Type de dossier')
  const sourceId = requireString(input.sourceId, 'Dossier')
  const summary = requireString(input.summary, 'Décision', 10000)
  const regulatoryBasis = optionalString(input.regulatoryBasis, 10000)
  const appealDeadline = input.appealDeadline ? new Date(String(input.appealDeadline)) : null
  if (appealDeadline && Number.isNaN(appealDeadline.getTime())) throw new Error('Délai d’appel invalide')
  const id = newFederalOperationId()
  const decisionNumber = optionalString(input.decisionNumber, 100) ?? `DEC-${new Date().getFullYear()}-${id.slice(0, 8).toUpperCase()}`
  const outcome = input.outcome && typeof input.outcome === 'object' ? input.outcome : null
  await source.transaction(async manager => {
    await manager.query(
      `INSERT INTO federal_commission_decisions
        (id, session_id, commission_id, source_type, source_id, decision_number, summary, regulatory_basis, outcome, decided_at, appeal_deadline, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
      [id, sessionId, sessionRow.commission_id, sourceType, sourceId, decisionNumber, summary, regulatoryBasis, outcome ? JSON.stringify(outcome) : null, appealDeadline, audit.userId],
    )
    await recordFederalOperationAudit(manager, audit, 'COMMISSION_DECISION', id, 'DECIDED', null, { decisionNumber, sourceType, sourceId, summary, regulatoryBasis, outcome, appealDeadline })
  })
  return { id, sessionId, decisionNumber, sourceType, sourceId, summary, signedAt: null }
}

export async function signFederalCommissionDecision(
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  decisionId: string,
) {
  const decision = await loadDecision(source, session, decisionId)
  assertDecisionMutable(decision.signed_at)
  await source.transaction(async manager => {
    await manager.query(
      `UPDATE federal_commission_decisions SET signed_at = CURRENT_TIMESTAMP, signed_by = ? WHERE id = ? AND signed_at IS NULL`,
      [audit.userId, decisionId],
    )
    await recordFederalOperationAudit(manager, audit, 'COMMISSION_DECISION', decisionId, 'SIGNED', { signedAt: decision.signed_at }, { signedBy: audit.userId })
  })
  return { id: decisionId, signedBy: audit.userId }
}

export async function markFederalCommissionDecisionNotified(
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  decisionId: string,
) {
  const decision = await loadDecision(source, session, decisionId)
  if (!decision.signed_at) throw new FederalOperationWorkflowError('La décision doit être signée avant notification')
  await source.transaction(async manager => {
    await manager.query(`UPDATE federal_commission_decisions SET notified_at = CURRENT_TIMESTAMP WHERE id = ?`, [decisionId])
    await recordFederalOperationAudit(manager, audit, 'COMMISSION_DECISION', decisionId, 'NOTIFIED', null, { notified: true })
  })
  return { id: decisionId, notified: true }
}

export async function listFederalCommissionSessions(source: FederalOperationSource, session: SsoUser, commissionId?: string) {
  const scope = buildFederalOperationScopeFilter(session, 'c')
  const params: unknown[] = [...scope.params]
  let extra = ''
  if (commissionId) {
    extra = ' AND s.commission_id = ?'
    params.push(commissionId)
  }
  return source.query(
    `SELECT s.*, c.name AS commission_name, c.commission_type, c.federation_id, c.league_id
       FROM federal_commission_sessions s
       JOIN federal_commissions c ON c.id = s.commission_id
      WHERE ${scope.sql}${extra}
      ORDER BY s.scheduled_at DESC`,
    params,
  )
}

export async function listFederalCommissionDecisions(source: FederalOperationSource, session: SsoUser) {
  const scope = buildFederalOperationScopeFilter(session, 'c')
  return source.query(
    `SELECT d.*, c.name AS commission_name, c.commission_type, c.federation_id, c.league_id
       FROM federal_commission_decisions d
       JOIN federal_commissions c ON c.id = d.commission_id
      WHERE ${scope.sql}
      ORDER BY d.decided_at DESC`,
    scope.params,
  )
}
