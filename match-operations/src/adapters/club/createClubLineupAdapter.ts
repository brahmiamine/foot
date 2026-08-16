import type { ClubLineupReadPort } from '../../../../packages/domain-contracts/src/club-lineup'
import { ClubHttpClient } from '../../../../packages/club-client/src'
import { selectDomainBoundaryMode } from '../../../../packages/utils/src'
import { SharedDatabaseClubLineupAdapter } from './SharedDatabaseClubLineupAdapter'

export function createClubLineupAdapter(
  env: NodeJS.ProcessEnv = process.env,
): ClubLineupReadPort {
  const baseUrl = env.CLUB_HUB_SERVICE_URL
  const apiKey = env.CLUB_HUB_SERVICE_API_KEY
  const mode = selectDomainBoundaryMode({
    boundary: 'match-operations->club-lineup',
    baseUrl,
    apiKey,
    requireHttp: env.DOMAIN_BOUNDARY_REQUIRE_HTTP === 'true',
  })
  if (mode === 'shared-db') return new SharedDatabaseClubLineupAdapter()
  return new ClubHttpClient({ baseUrl: baseUrl!, apiKey: apiKey! })
}
