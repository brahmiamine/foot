import type { ClubPlayerRegulatoryFactsPort } from '../../../../packages/domain-contracts/src/club-player-facts'
import { ClubHttpClient } from '../../../../packages/club-client/src'
import { SharedDatabaseClubPlayerFactsAdapter } from './SharedDatabaseClubPlayerFactsAdapter'

/**
 * Dedicated migration switch for Club-owned regulatory facts. These variables
 * are intentionally separate from the generic CLUB_HUB_URL used by the match
 * cancellation saga so a rolling deployment cannot activate this boundary
 * before club-hub exposes the corresponding endpoint.
 */
export function createClubPlayerFactsAdapter(
  env: NodeJS.ProcessEnv = process.env,
): ClubPlayerRegulatoryFactsPort {
  const baseUrl = env.CLUB_PLAYER_FACTS_URL
  const apiKey = env.CLUB_PLAYER_FACTS_SERVICE_API_KEY

  if (!baseUrl && !apiKey) return new SharedDatabaseClubPlayerFactsAdapter()
  if (!baseUrl || !apiKey) {
    throw new Error(
      'CLUB_PLAYER_FACTS_URL and CLUB_PLAYER_FACTS_SERVICE_API_KEY must be configured together',
    )
  }

  return new ClubHttpClient({ baseUrl, apiKey })
}
