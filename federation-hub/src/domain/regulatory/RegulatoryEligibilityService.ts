import { getDataSource } from '@/lib/db'
import { EligibilityCheck } from '@/lib/entities'
import {
  eligibilityResult,
  fitsAgeCategory,
} from '../../../../packages/regulatory-shared/src/eligibility'
import {
  meetsMinimumQualification,
  type CoachQualificationType,
} from '../../../../packages/regulatory-shared/src/coachQualification'
import type {
  EligibilityBlockingReason,
  EligibilityCheckRequest,
  EligibilityContext,
  EligibilityResult,
  EligibilityServicePort,
} from '../../../../packages/domain-contracts/src/eligibility'
import type {
  HeadCoachQualificationCheckRequest,
  HeadCoachQualificationResult,
  StaffQualificationServicePort,
} from '../../../../packages/domain-contracts/src/staff-eligibility'

type MatchContextRow = {
  equipeHome: string
  equipeAway: string
  matchDate: Date | null
  seasonId: string | null
}

type SeasonRow = {
  requiresPlayerContract: number | boolean | string
  requiresMedicalClearance: number | boolean | string
  minimumHeadCoachQualification: CoachQualificationType | null
}

type PlayerRow = { birthDate: Date | string | null }
type TeamRow = { ageCategory: string | null }
type SourceRow = { source: string }
type QualificationRow = { qualificationType: CoachQualificationType }

function databaseBoolean(value: number | boolean | string | null | undefined): boolean {
  return value === true || value === 1 || value === '1'
}

async function exists(query: string, parameters: unknown[]): Promise<boolean> {
  const ds = await getDataSource()
  const rows = (await ds.query(query, parameters)) as Array<{ found: number | string }>
  return Number(rows[0]?.found ?? 0) > 0
}

/**
 * Federation-owned regulatory decision service.
 *
 * During the shared-database transition this service still reads a few facts
 * owned by Club/Match directly from MariaDB. Crucially, those reads are now
 * behind the federation service boundary: match-operations no longer needs to
 * know how regulatory tables are combined to reach a decision.
 */
export class RegulatoryEligibilityService
  implements EligibilityServicePort, StaffQualificationServicePort
{
  async checkPlayerEligibility(
    input: EligibilityCheckRequest,
    context: EligibilityContext = {},
  ): Promise<EligibilityResult> {
    const ds = await getDataSource()
    const matchRows = (await ds.query(
      `SELECT m.equipe_home AS equipeHome,
              m.equipe_away AS equipeAway,
              m.date AS matchDate,
              j.saison_id AS seasonId
         FROM matches m
         LEFT JOIN journees j ON j.id = m.journee_id
        WHERE m.id = ?
        LIMIT 1`,
      [input.matchId],
    )) as MatchContextRow[]
    const match = matchRows[0]
    if (!match) throw new Error('Match introuvable')

    const matchDate = match.matchDate ? new Date(match.matchDate) : new Date()
    const seasonId = input.seasonId ?? match.seasonId ?? undefined
    if (!seasonId) throw new Error('Saison du match introuvable')

    const seasonRows = (await ds.query(
      `SELECT requires_player_contract AS requiresPlayerContract,
              requires_medical_clearance AS requiresMedicalClearance,
              minimum_head_coach_qualification AS minimumHeadCoachQualification
         FROM saisons
        WHERE id = ?
        LIMIT 1`,
      [seasonId],
    )) as SeasonRow[]
    const season = seasonRows[0]

    const reasons: EligibilityBlockingReason[] = []
    if (![match.equipeHome, match.equipeAway].includes(input.clubId)) {
      reasons.push('NOT_MATCH_TEAM')
    }

    const [
      membership,
      license,
      registration,
      competitionEntry,
      suspension,
      transfer,
      medical,
      legacyRows,
      playerRows,
      teamRows,
    ] = await Promise.all([
      exists(
        `SELECT EXISTS(
           SELECT 1 FROM cms_team_members
            WHERE player_id = ? AND team_id = ?
              AND status IN ('ACTIVE','ENDED')
              AND start_date <= ?
              AND (end_date IS NULL OR end_date >= ?)
         ) AS found`,
        [input.playerId, input.clubId, matchDate, matchDate],
      ),
      exists(
        `SELECT EXISTS(
           SELECT 1 FROM person_licenses
            WHERE person_reference_id = ? AND club_id = ? AND season_id = ?
              AND person_type = 'PLAYER' AND status = 'APPROVED'
              AND (expires_at IS NULL OR expires_at >= ?)
         ) AS found`,
        [input.playerId, input.clubId, seasonId, matchDate],
      ),
      exists(
        `SELECT EXISTS(
           SELECT 1 FROM player_registrations
            WHERE player_id = ? AND club_id = ? AND season_id = ?
              AND status = 'APPROVED' AND eligibility_status = 'ELIGIBLE'
         ) AS found`,
        [input.playerId, input.clubId, seasonId],
      ),
      exists(
        `SELECT EXISTS(
           SELECT 1 FROM competition_registrations
            WHERE team_id = ? AND season_id = ? AND status = 'APPROVED'
         ) AS found`,
        [input.clubId, seasonId],
      ),
      exists(
        `SELECT EXISTS(
           SELECT 1 FROM Suspension
            WHERE playerId = ?
              AND (teamId IS NULL OR teamId = ?)
              AND status = 'ACTIVE'
              AND matchesPurged < COALESCE(overrideMatchesCount, matchesCount)
         ) AS found`,
        [input.playerId, input.clubId],
      ),
      exists(
        `SELECT EXISTS(
           SELECT 1 FROM player_transfers
            WHERE player_id = ? AND from_team_id = ?
              AND status IN ('PENDING','APPROVED')
              AND effective_date <= ?
         ) AS found`,
        [input.playerId, input.clubId, matchDate],
      ),
      exists(
        `SELECT EXISTS(
           SELECT 1 FROM medical_eligibilities
            WHERE player_id = ? AND club_id = ? AND season_id = ?
              AND status = 'FIT'
              AND (expires_at IS NULL OR expires_at >= ?)
         ) AS found`,
        [input.playerId, input.clubId, seasonId, matchDate],
      ),
      ds.query(
        `SELECT source FROM regulatory_legacy_confirmations
          WHERE player_id = ? AND club_id = ? AND season_id = ?
            AND (expires_at IS NULL OR expires_at >= ?)
          LIMIT 1`,
        [input.playerId, input.clubId, seasonId, matchDate],
      ) as Promise<SourceRow[]>,
      ds.query('SELECT birthDate FROM Player WHERE id = ? LIMIT 1', [input.playerId]) as Promise<PlayerRow[]>,
      ds.query('SELECT age_category AS ageCategory FROM teams WHERE id = ? LIMIT 1', [input.clubId]) as Promise<TeamRow[]>,
    ])

    const legacyAdministrativeFallback = legacyRows.length > 0
    if (!membership) reasons.push('NO_ACTIVE_MEMBERSHIP')
    if (!license && !legacyAdministrativeFallback) reasons.push('NO_ACTIVE_LICENSE')
    if (!registration && !legacyAdministrativeFallback) reasons.push('REGISTRATION_NOT_APPROVED')
    if (!competitionEntry && !legacyAdministrativeFallback) reasons.push('CLUB_NOT_REGISTERED')

    if (databaseBoolean(season?.requiresPlayerContract)) {
      const contract = await exists(
        `SELECT EXISTS(
           SELECT 1 FROM player_contracts
            WHERE player_id = ? AND club_id = ? AND season_id = ?
              AND status = 'SIGNED' AND federation_status = 'APPROVED'
              AND start_date <= ? AND end_date >= ?
         ) AS found`,
        [input.playerId, input.clubId, seasonId, matchDate, matchDate],
      )
      if (!contract && !legacyAdministrativeFallback) reasons.push('CONTRACT_NOT_HOMOLOGATED')
    }

    if (suspension) reasons.push('ACTIVE_SUSPENSION')
    if (transfer) reasons.push('TRANSFER_PENDING_OR_EFFECTIVE')
    if (
      databaseBoolean(season?.requiresMedicalClearance) &&
      !medical &&
      !legacyAdministrativeFallback
    ) {
      reasons.push('MEDICAL_CLEARANCE_REQUIRED')
    }

    const player = playerRows[0]
    const team = teamRows[0]
    if (player && team && !fitsAgeCategory(team.ageCategory, player.birthDate, matchDate)) {
      reasons.push('AGE_CATEGORY_MISMATCH')
    }

    const warnings: string[] = []
    if (!player?.birthDate) warnings.push('DATE_OF_BIRTH_MISSING')
    if (legacyAdministrativeFallback) {
      warnings.push(`LEGACY_REGULATORY_CONFIRMATION:${legacyRows[0]?.source ?? 'UNKNOWN'}`)
    }

    const result = eligibilityResult(reasons, warnings)
    const checks = ds.getRepository(EligibilityCheck)
    await checks.save(
      checks.create({
        playerId: input.playerId,
        clubId: input.clubId,
        matchId: input.matchId,
        seasonId,
        eligible: result.eligible,
        blockingReasons: result.blockingReasons,
        warnings: result.warnings,
        actorUserId: context.actorUserId ?? null,
        actorRole: context.actorRole ?? 'MATCH_OFFICIAL',
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      }),
    )

    return result
  }

  async checkHeadCoachQualification(
    input: HeadCoachQualificationCheckRequest,
  ): Promise<HeadCoachQualificationResult> {
    const ds = await getDataSource()
    const seasonRows = (await ds.query(
      `SELECT minimum_head_coach_qualification AS minimumHeadCoachQualification
         FROM saisons WHERE id = ? LIMIT 1`,
      [input.seasonId],
    )) as SeasonRow[]
    const requiredQualification = seasonRows[0]?.minimumHeadCoachQualification ?? null
    if (!requiredQualification) return { eligible: true, requiredQualification: null }

    const qualifications = (await ds.query(
      `SELECT qualification_type AS qualificationType
         FROM coach_qualifications
        WHERE staff_id = ? AND club_id = ? AND status = 'VALID'
          AND (expires_at IS NULL OR expires_at >= ?)`,
      [input.staffId, input.clubId, input.matchDate],
    )) as QualificationRow[]

    return {
      eligible: qualifications.some((item) =>
        meetsMinimumQualification(item.qualificationType, requiredQualification),
      ),
      requiredQualification,
    }
  }
}
