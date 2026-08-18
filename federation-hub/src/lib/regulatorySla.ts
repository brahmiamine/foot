import type { DataSource } from 'typeorm'
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
import { assertValidSlaThresholds, computeRegulatorySlaState, type RegulatorySlaState } from './federalOperationsRules'

export const REGULATORY_SLA_DOMAINS = ['CLUB_LICENSE', 'COMPETITION_ENTRY', 'DISCIPLINE', 'APPEAL', 'INSURANCE', 'GRANT', 'DOCUMENT_COMPLIANCE'] as const
export type RegulatorySlaDomain = (typeof REGULATORY_SLA_DOMAINS)[number]

/** Comportement historique : ces délais ne s'appliquent que si aucune policy n'est configurée pour le domaine (aucun changement de comportement tant que la fédération n'a rien réglé). */
export const DEFAULT_SLA_HOURS: Record<RegulatorySlaDomain, { warnAfterHours: number; overdueAfterHours: number }> = {
  CLUB_LICENSE: { warnAfterHours: 72, overdueAfterHours: 168 },
  COMPETITION_ENTRY: { warnAfterHours: 72, overdueAfterHours: 168 },
  DISCIPLINE: { warnAfterHours: 48, overdueAfterHours: 120 },
  APPEAL: { warnAfterHours: 48, overdueAfterHours: 120 },
  INSURANCE: { warnAfterHours: 72, overdueAfterHours: 168 },
  GRANT: { warnAfterHours: 72, overdueAfterHours: 240 },
  DOCUMENT_COMPLIANCE: { warnAfterHours: 72, overdueAfterHours: 168 },
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
}

interface SlaPolicyRow {
  domain: RegulatorySlaDomain
  warn_after_hours: number
  overdue_after_hours: number
}

export async function listRegulatorySlaPolicies(source: FederalOperationSource, session: SsoUser, federationId: string) {
  assertFederalOperationScope(session, federationId)
  const rows = await source.query(`SELECT * FROM regulatory_sla_policies WHERE federation_id = ? ORDER BY domain`, [federationId]) as SlaPolicyRow[]
  const byDomain = new Map(rows.map((row) => [row.domain, row]))
  return REGULATORY_SLA_DOMAINS.map((domain) => {
    const configured = byDomain.get(domain)
    return {
      domain,
      warnAfterHours: configured?.warn_after_hours ?? DEFAULT_SLA_HOURS[domain].warnAfterHours,
      overdueAfterHours: configured?.overdue_after_hours ?? DEFAULT_SLA_HOURS[domain].overdueAfterHours,
      isDefault: !configured,
    }
  })
}

export async function upsertRegulatorySlaPolicy(
  source: DataSource,
  session: SsoUser,
  audit: FederalOperationAuditContext,
  federationId: string,
  domainInput: unknown,
  warnAfterHours: unknown,
  overdueAfterHours: unknown,
) {
  assertFederalOperationScope(session, federationId)
  const domain = requireEnum(domainInput, REGULATORY_SLA_DOMAINS, 'Domaine SLA')
  const warn = Number(warnAfterHours)
  const overdue = Number(overdueAfterHours)
  assertValidSlaThresholds(warn, overdue)
  await source.transaction(async (manager) => {
    await manager.query(
      `INSERT INTO regulatory_sla_policies (id, federation_id, domain, warn_after_hours, overdue_after_hours, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE warn_after_hours = VALUES(warn_after_hours), overdue_after_hours = VALUES(overdue_after_hours), updated_by = VALUES(updated_by)`,
      [newFederalOperationId(), federationId, domain, warn, overdue, audit.userId],
    )
    await recordFederalOperationAudit(manager, audit, 'REGULATORY_SLA_POLICY', `${federationId}:${domain}`, 'UPSERTED', null, { domain, warnAfterHours: warn, overdueAfterHours: overdue })
  })
  return { domain, warnAfterHours: warn, overdueAfterHours: overdue }
}

type PendingRow = { entity_id: string; label: string; federation_id: string; league_id: string | null; pending_since: Date | string; hours_pending: number | string }

async function queryPending(source: FederalOperationSource, sql: string, params: unknown[]): Promise<PendingRow[]> {
  return source.query(sql, params) as Promise<PendingRow[]>
}

/** Chaque domaine construit sa propre requête + ses propres paramètres : le filtre de scope apparaît une fois par SELECT (2x pour l'union assurances club/personnes), donc les paramètres doivent être dupliqués en conséquence. */
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

/** FED-010 : file d'attente en retard, calculée à la volée à partir des dossiers déjà en attente de revue dans chaque domaine réglementaire. */
export async function getRegulatorySlaOverdueQueue(source: FederalOperationSource, session: SsoUser, federationId: string): Promise<RegulatorySlaQueueItem[]> {
  assertFederalOperationScope(session, federationId)
  const policies = await listRegulatorySlaPolicies(source, session, federationId)
  const thresholds = new Map(policies.map((policy) => [policy.domain, policy]))
  const scope = buildFederalOperationScopeFilter(session)
  const items: RegulatorySlaQueueItem[] = []
  for (const domain of REGULATORY_SLA_DOMAINS) {
    const threshold = thresholds.get(domain)!
    const { sql, params } = PENDING_QUERIES[domain](scope)
    const rows = await queryPending(source, sql, params)
    for (const row of rows) {
      const hoursPending = Number(row.hours_pending)
      items.push({
        domain,
        entityId: row.entity_id,
        label: row.label,
        federationId: row.federation_id,
        leagueId: row.league_id,
        pendingSince: row.pending_since,
        hoursPending,
        state: computeRegulatorySlaState(hoursPending, threshold.warnAfterHours, threshold.overdueAfterHours),
      })
    }
  }
  return items
    .filter((item) => item.state !== 'IN_SLA')
    .sort((left, right) => right.hoursPending - left.hoursPending)
}
