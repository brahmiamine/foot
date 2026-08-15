import type { ClubPlayerRegulatoryFactsPort } from '../../../../packages/domain-contracts/src/club-player-facts'
import { ClubHttpClient } from '../../../../packages/club-client/src'
import { SharedDatabaseClubPlayerFactsAdapter } from './SharedDatabaseClubPlayerFactsAdapter'

export function createClubPlayerFactsAdapter(
  env: NodeJS.ProcessEnv = process.env,
): ClubPlayerRegulatoryFactsPort {
  const baseUrl = env.CLUB_HUB_URL
  const apiKey = env.CLUB_HUB_SERVICE_API_KEY

  if (!baseUrl && !apiKey) return new SharedDatabaseClubPlayerFactsAdapter()
  if (!baseUrl || !apiKey) {
    throw new Error('CLUB_HUB_URL and CLUB_HUB_SERVICE_API_KEY must be configured together')
  }

  return new ClubHttpClient({ baseUrl, apiKey })
}
