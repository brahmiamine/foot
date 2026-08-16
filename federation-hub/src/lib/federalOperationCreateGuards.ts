import type { DataSource } from 'typeorm'
import {
  assertClubInFederalScope,
  assertSeasonInFederalScope,
  optionalString,
  requireString,
} from './federalOperationsCommon'

async function validateClubs(
  dataSource: DataSource,
  federationId: string,
  leagueId: string | null,
  values: unknown[],
): Promise<void> {
  const clubIds = [...new Set(values.filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).map(value => value.trim()))]
  for (const clubId of clubIds) await assertClubInFederalScope(dataSource, federationId, leagueId, clubId)
}

export async function assertFederalOperationCreateReferences(
  dataSource: DataSource,
  domain: string,
  input: Record<string, unknown>,
): Promise<void> {
  if (!['insurance', 'grants', 'broadcasting', 'training-compensation', 'solidarity', 'documents'].includes(domain)) return

  const federationId = requireString(input.federationId, 'Fédération')
  const leagueId = optionalString(input.leagueId)
  const seasonId = domain === 'insurance' || domain === 'broadcasting'
    ? requireString(input.seasonId, 'Saison')
    : optionalString(input.seasonId)

  if (seasonId) await assertSeasonInFederalScope(dataSource, federationId, leagueId, seasonId)

  if (domain === 'insurance') {
    if (input.policyScope === 'PERSON') {
      const clubId = optionalString(input.clubId)
      if (clubId) await assertClubInFederalScope(dataSource, federationId, leagueId, clubId)
    } else {
      await assertClubInFederalScope(dataSource, federationId, leagueId, requireString(input.clubId, 'Club'))
    }
    return
  }

  if (domain === 'broadcasting') {
    const allocations = Array.isArray(input.allocations) ? input.allocations : []
    await validateClubs(
      dataSource,
      federationId,
      leagueId,
      allocations.map(item => item && typeof item === 'object' ? (item as Record<string, unknown>).clubId : null),
    )
    return
  }

  if (domain === 'training-compensation') {
    const beneficiaries = Array.isArray(input.beneficiaries) ? input.beneficiaries : []
    await validateClubs(dataSource, federationId, leagueId, [
      input.liableClubId,
      ...beneficiaries.map(item => item && typeof item === 'object' ? (item as Record<string, unknown>).clubId : null),
    ])
    return
  }

  if (domain === 'solidarity') {
    const allocations = Array.isArray(input.allocations) ? input.allocations : []
    await validateClubs(dataSource, federationId, leagueId, [
      input.triggeringClubId,
      input.receivingClubId,
      ...allocations.map(item => item && typeof item === 'object' ? (item as Record<string, unknown>).clubId : null),
    ])
  }
}
