import type { DataSource } from 'typeorm'
import type { SsoUser } from './ssoSession'
import {
  assertFederalOperationScope,
  buildFederalOperationScopeFilter,
  type FederalOperationAuditContext,
  type FederalOperationSource,
  newFederalOperationId,
  optionalString,
  recordFederalOperationAudit,
  requireEnum,
  requireString,
} from './federalOperationsCommon'
import { FederalOperationWorkflowError } from './federalOperationsRules'

const GENDERS = ['MALE', 'FEMALE', 'MIXED'] as const
const DISCIPLINES = ['FOOTBALL', 'FUTSAL', 'BEACH_SOCCER'] as const
const EVENT_TYPES = ['CAMP', 'MATCH', 'TRAVEL', 'MEDICAL', 'MEETING'] as const
const EVENT_STATUSES = ['PLANNED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const
const CALLUP_STATUSES = ['DRAFT', 'SUMMONED', 'CONFIRMED', 'DECLINED', 'RELEASED', 'WITHDRAWN'] as const

const CALLUP_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ['SUMMONED', 'WITHDRAWN'],
  SUMMONED: ['CONFIRMED', 'DECLINED', 'WITHDRAWN'],
  CONFIRMED: ['RELEASED', 'WITHDRAWN'],
  DECLINED: [],
  RELEASED: [],
  WITHDRAWN: [],
}

type NationalTeamRow = { id: string; federation_id: string; status: string }

async function loadNationalTeam(source: FederalOperationSource, session: SsoUser, teamId: string): Promise<NationalTeamRow> {
  const rows = await source.query(`SELECT * FROM national_teams WHERE id = ? LIMIT 1`, [teamId]) as NationalTeamRow[]
  const row = rows[0]
  if (!row) throw new Error('Sélection nationale introuvable')
  assertFederalOperationScope(session, row.federation_id, null)
  return row
}

export async function listNationalTeams(source: FederalOperationSource, session: SsoUser) {
  const scope = buildFederalOperationScopeFilter(session, 'x')
  return source.query(
    `SELECT x.*,
            (SELECT COUNT(*) FROM national_team_events e WHERE e.national_team_id = x.id AND e.status NOT IN ('COMPLETED','CANCELLED')) AS upcoming_events,
            (SELECT COUNT(*) FROM national_team_callups c WHERE c.national_team_id = x.id AND c.status IN ('SUMMONED','CONFIRMED')) AS active_callups
       FROM national_teams x
      WHERE ${scope.sql}
      ORDER BY x.discipline, x.age_category, x.name`,
    scope.params,
  )
}

export async function createNationalTeam(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, input: Record<string, unknown>) {
  const federationId = requireString(input.federationId, 'Fédération')
  assertFederalOperationScope(session, federationId, null)
  const id = newFederalOperationId()
  const code = requireString(input.code, 'Code', 80).toUpperCase()
  const name = requireString(input.name, 'Nom')
  const ageCategory = requireString(input.ageCategory, 'Catégorie', 50)
  const gender = requireEnum(input.gender, GENDERS, 'Genre')
  const discipline = requireEnum(input.discipline ?? 'FOOTBALL', DISCIPLINES, 'Discipline')
  await source.transaction(async manager => {
    await manager.query(
      `INSERT INTO national_teams
        (id, federation_id, code, name, age_category, gender, discipline, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, federationId, code, name, ageCategory, gender, discipline, audit.userId],
    )
    await recordFederalOperationAudit(manager, audit, 'NATIONAL_TEAM', id, 'CREATED', null, { federationId, code, name, ageCategory, gender, discipline })
  })
  return { id, federationId, code, name, ageCategory, gender, discipline, status: 'ACTIVE' }
}

export async function createNationalTeamEvent(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, nationalTeamId: string, input: Record<string, unknown>) {
  const team = await loadNationalTeam(source, session, nationalTeamId)
  if (team.status !== 'ACTIVE') throw new FederalOperationWorkflowError('La sélection doit être active')
  const startsAt = new Date(requireString(input.startsAt, 'Début'))
  const endsAt = input.endsAt ? new Date(String(input.endsAt)) : null
  if (Number.isNaN(startsAt.getTime()) || (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt))) throw new Error('Période d’événement invalide')
  const eventType = requireEnum(input.eventType, EVENT_TYPES, 'Type d’événement')
  const id = newFederalOperationId()
  await source.transaction(async manager => {
    await manager.query(
      `INSERT INTO national_team_events
        (id, national_team_id, season_id, event_type, title, starts_at, ends_at, location, opponent, match_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, nationalTeamId, optionalString(input.seasonId), eventType, requireString(input.title, 'Titre'), startsAt, endsAt, optionalString(input.location, 255), optionalString(input.opponent), optionalString(input.matchId), audit.userId],
    )
    await recordFederalOperationAudit(manager, audit, 'NATIONAL_TEAM_EVENT', id, 'CREATED', null, { nationalTeamId, eventType, startsAt, endsAt })
  })
  return { id, nationalTeamId, eventType, status: 'PLANNED' }
}

export async function transitionNationalTeamEvent(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, eventId: string, targetStatus: unknown) {
  const rows = await source.query(
    `SELECT e.*, t.federation_id FROM national_team_events e JOIN national_teams t ON t.id = e.national_team_id WHERE e.id = ? LIMIT 1`,
    [eventId],
  ) as Array<{ id: string; status: string; federation_id: string }>
  const event = rows[0]
  if (!event) throw new Error('Événement de sélection introuvable')
  assertFederalOperationScope(session, event.federation_id, null)
  const to = requireEnum(targetStatus, EVENT_STATUSES, 'Statut événement')
  const allowed: Record<string, readonly string[]> = { PLANNED: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['COMPLETED', 'CANCELLED'], COMPLETED: [], CANCELLED: [] }
  if (!allowed[event.status]?.includes(to)) throw new FederalOperationWorkflowError(`Transition événement interdite : ${event.status} -> ${to}`)
  await source.transaction(async manager => {
    await manager.query(`UPDATE national_team_events SET status = ? WHERE id = ?`, [to, eventId])
    await recordFederalOperationAudit(manager, audit, 'NATIONAL_TEAM_EVENT', eventId, 'STATUS_CHANGED', { status: event.status }, { status: to })
  })
  return { id: eventId, status: to }
}

export async function createNationalTeamCallup(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, nationalTeamId: string, input: Record<string, unknown>) {
  const team = await loadNationalTeam(source, session, nationalTeamId)
  if (team.status !== 'ACTIVE') throw new FederalOperationWorkflowError('La sélection doit être active')
  const eventId = optionalString(input.eventId)
  if (eventId) {
    const events = await source.query(`SELECT id FROM national_team_events WHERE id = ? AND national_team_id = ? LIMIT 1`, [eventId, nationalTeamId]) as Array<{ id: string }>
    if (!events[0]) throw new Error('L’événement ne correspond pas à cette sélection')
  }
  const id = newFederalOperationId()
  await source.transaction(async manager => {
    await manager.query(
      `INSERT INTO national_team_callups
        (id, national_team_id, season_id, player_id, club_id, event_id, status, reporting_at, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)`,
      [id, nationalTeamId, optionalString(input.seasonId), requireString(input.playerId, 'Joueur'), optionalString(input.clubId), eventId, input.reportingAt ? new Date(String(input.reportingAt)) : null, optionalString(input.notes, 10000), audit.userId],
    )
    await recordFederalOperationAudit(manager, audit, 'NATIONAL_TEAM_CALLUP', id, 'CREATED', null, { nationalTeamId, eventId, playerId: input.playerId, clubId: input.clubId })
  })
  return { id, nationalTeamId, eventId, status: 'DRAFT' }
}

export async function transitionNationalTeamCallup(source: DataSource, session: SsoUser, audit: FederalOperationAuditContext, callupId: string, targetStatus: unknown, reason?: string | null) {
  const rows = await source.query(
    `SELECT c.*, t.federation_id FROM national_team_callups c JOIN national_teams t ON t.id = c.national_team_id WHERE c.id = ? LIMIT 1`,
    [callupId],
  ) as Array<{ id: string; status: string; federation_id: string }>
  const callup = rows[0]
  if (!callup) throw new Error('Convocation introuvable')
  assertFederalOperationScope(session, callup.federation_id, null)
  const to = requireEnum(targetStatus, CALLUP_STATUSES, 'Statut convocation')
  if (!CALLUP_TRANSITIONS[callup.status]?.includes(to)) throw new FederalOperationWorkflowError(`Transition convocation interdite : ${callup.status} -> ${to}`)
  await source.transaction(async manager => {
    await manager.query(`UPDATE national_team_callups SET status = ?, notes = CASE WHEN ? IS NULL THEN notes ELSE ? END WHERE id = ?`, [to, reason ?? null, reason ?? null, callupId])
    await recordFederalOperationAudit(manager, audit, 'NATIONAL_TEAM_CALLUP', callupId, 'STATUS_CHANGED', { status: callup.status }, { status: to }, reason)
  })
  return { id: callupId, status: to }
}

export async function listNationalTeamEvents(source: FederalOperationSource, session: SsoUser, nationalTeamId: string) {
  await loadNationalTeam(source, session, nationalTeamId)
  return source.query(`SELECT * FROM national_team_events WHERE national_team_id = ? ORDER BY starts_at DESC`, [nationalTeamId])
}

export async function listNationalTeamCallups(source: FederalOperationSource, session: SsoUser, nationalTeamId: string) {
  await loadNationalTeam(source, session, nationalTeamId)
  return source.query(`SELECT * FROM national_team_callups WHERE national_team_id = ? ORDER BY created_at DESC`, [nationalTeamId])
}
