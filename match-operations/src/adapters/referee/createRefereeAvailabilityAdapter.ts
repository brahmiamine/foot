import type { RefereeAvailabilityPort } from '../../../../packages/domain-contracts/src/referee-availability'
import { RefereeHttpClient } from '../../../../packages/referee-client/src'
import { selectDomainBoundaryMode } from '../../../../packages/utils/src'
import { SharedDatabaseRefereeAvailabilityAdapter } from './SharedDatabaseRefereeAvailabilityAdapter'

export function createRefereeAvailabilityAdapter(
  env: NodeJS.ProcessEnv = process.env,
): RefereeAvailabilityPort {
  const baseUrl = env.REFEREE_HUB_URL
  const apiKey = env.REFEREE_HUB_SERVICE_API_KEY
  const mode = selectDomainBoundaryMode({
    boundary: 'match-operations->referee-availability',
    baseUrl,
    apiKey,
    requireHttp: env.DOMAIN_BOUNDARY_REQUIRE_HTTP === 'true',
  })
  if (mode === 'shared-db') return new SharedDatabaseRefereeAvailabilityAdapter()
  return new RefereeHttpClient({ baseUrl: baseUrl!, apiKey: apiKey! })
}
