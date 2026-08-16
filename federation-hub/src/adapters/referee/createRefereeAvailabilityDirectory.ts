import type { RefereeAvailabilityDirectoryPort } from '../../../../packages/domain-contracts/src/referee-availability'
import { RefereeHttpClient } from '../../../../packages/referee-client/src'
import { selectDomainBoundaryMode } from '../../../../packages/utils/src'
import { SharedDatabaseRefereeAvailabilityDirectoryAdapter } from './SharedDatabaseRefereeAvailabilityDirectoryAdapter'

export function createRefereeAvailabilityDirectory(
  env: NodeJS.ProcessEnv = process.env,
): RefereeAvailabilityDirectoryPort {
  const baseUrl = env.REFEREE_HUB_SERVICE_URL
  const apiKey = env.REFEREE_HUB_SERVICE_API_KEY
  const mode = selectDomainBoundaryMode({
    boundary: 'federation-hub->referee-availability',
    baseUrl,
    apiKey,
    requireHttp: env.DOMAIN_BOUNDARY_REQUIRE_HTTP === 'true',
  })
  if (mode === 'shared-db') return new SharedDatabaseRefereeAvailabilityDirectoryAdapter()
  return new RefereeHttpClient({ baseUrl: baseUrl!, apiKey: apiKey! })
}
