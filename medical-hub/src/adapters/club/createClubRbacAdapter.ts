import type { ClubRbacReadPort } from '../../../../packages/domain-contracts/src/club-access'
import { ClubHttpClient } from '../../../../packages/club-client/src'
import { SharedDatabaseClubRbacAdapter } from './SharedDatabaseClubRbacAdapter'

export function createClubRbacAdapter(
  env: NodeJS.ProcessEnv = process.env,
): ClubRbacReadPort {
  const baseUrl = env.CLUB_HUB_SERVICE_URL
  const apiKey = env.CLUB_HUB_SERVICE_API_KEY

  if (!baseUrl && !apiKey) return new SharedDatabaseClubRbacAdapter()
  if (!baseUrl || !apiKey) {
    throw new Error('CLUB_HUB_SERVICE_URL and CLUB_HUB_SERVICE_API_KEY must be configured together')
  }

  return new ClubHttpClient({ baseUrl, apiKey })
}
