import type { IdentityProfilePort } from '../../../../packages/domain-contracts/src/identity'
import { IdentityHttpClient } from '../../../../packages/identity-client/src'
import { selectDomainBoundaryMode } from '../../../../packages/utils/src'
import { SharedDatabaseIdentityProfileAdapter } from './SharedDatabaseIdentityProfileAdapter'

export function createIdentityProfileAdapter(
  env: NodeJS.ProcessEnv = process.env,
): IdentityProfilePort {
  const baseUrl = env.IDENTITY_SERVICE_URL
  const apiKey = env.IDENTITY_SERVICE_API_KEY
  const mode = selectDomainBoundaryMode({
    boundary: 'referee-hub->identity',
    baseUrl,
    apiKey,
    requireHttp: env.DOMAIN_BOUNDARY_REQUIRE_HTTP === 'true',
  })
  if (mode === 'shared-db') return new SharedDatabaseIdentityProfileAdapter()
  return new IdentityHttpClient({ baseUrl: baseUrl!, apiKey: apiKey! })
}
