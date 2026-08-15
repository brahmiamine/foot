import type { RefereeAvailabilityDirectoryPort } from '../../../../packages/domain-contracts/src/referee-availability'
import { RefereeHttpClient } from '../../../../packages/referee-client/src'
import { SharedDatabaseRefereeAvailabilityDirectoryAdapter } from './SharedDatabaseRefereeAvailabilityDirectoryAdapter'

export function createRefereeAvailabilityDirectory(
  env: NodeJS.ProcessEnv = process.env,
): RefereeAvailabilityDirectoryPort {
  const baseUrl = env.REFEREE_HUB_SERVICE_URL
  const apiKey = env.REFEREE_HUB_SERVICE_API_KEY

  if (!baseUrl && !apiKey) return new SharedDatabaseRefereeAvailabilityDirectoryAdapter()

  if (!baseUrl || !apiKey) {
    throw new Error(
      'REFEREE_HUB_SERVICE_URL and REFEREE_HUB_SERVICE_API_KEY must be configured together',
    )
  }

  return new RefereeHttpClient({ baseUrl, apiKey })
}
