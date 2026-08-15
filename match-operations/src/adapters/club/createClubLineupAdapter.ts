import type { ClubLineupReadPort } from '../../../../packages/domain-contracts/src/club-lineup'
import { ClubHttpClient } from '../../../../packages/club-client/src'
import { SharedDatabaseClubLineupAdapter } from './SharedDatabaseClubLineupAdapter'

/**
 * Transitional composition root for club-owned match lineups.
 * Shared DB remains the default until both service variables are configured.
 */
export function createClubLineupAdapter(
  env: NodeJS.ProcessEnv = process.env,
): ClubLineupReadPort {
  const baseUrl = env.CLUB_HUB_SERVICE_URL
  const apiKey = env.CLUB_HUB_SERVICE_API_KEY

  if (!baseUrl && !apiKey) return new SharedDatabaseClubLineupAdapter()

  if (!baseUrl || !apiKey) {
    throw new Error('CLUB_HUB_SERVICE_URL and CLUB_HUB_SERVICE_API_KEY must be configured together')
  }

  return new ClubHttpClient({ baseUrl, apiKey })
}
