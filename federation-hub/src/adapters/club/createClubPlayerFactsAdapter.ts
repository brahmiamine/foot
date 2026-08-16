import type { ClubPlayerRegulatoryFactsPort } from '../../../../packages/domain-contracts/src/club-player-facts'
import { ClubHttpClient } from '../../../../packages/club-client/src'
import { selectDomainBoundaryMode } from '../../../../packages/utils/src'
import { SharedDatabaseClubPlayerFactsAdapter } from './SharedDatabaseClubPlayerFactsAdapter'

export function createClubPlayerFactsAdapter(
  env: NodeJS.ProcessEnv = process.env,
): ClubPlayerRegulatoryFactsPort {
  const baseUrl = env.CLUB_PLAYER_FACTS_URL
  const apiKey = env.CLUB_PLAYER_FACTS_SERVICE_API_KEY
  const mode = selectDomainBoundaryMode({
    boundary: 'federation-hub->club-player-facts',
    baseUrl,
    apiKey,
    requireHttp: env.DOMAIN_BOUNDARY_REQUIRE_HTTP === 'true',
  })
  if (mode === 'shared-db') return new SharedDatabaseClubPlayerFactsAdapter()
  return new ClubHttpClient({ baseUrl: baseUrl!, apiKey: apiKey! })
}
