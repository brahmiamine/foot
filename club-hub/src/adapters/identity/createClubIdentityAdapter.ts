import type {
  IdentityAccountProvisioningPort,
  IdentityDirectoryPort,
} from '../../../../packages/domain-contracts/src/identity'
import { IdentityHttpClient } from '../../../../packages/identity-client/src'
import { selectDomainBoundaryMode } from '../../../../packages/utils/src'
import { SharedDatabaseClubIdentityAdapter } from './SharedDatabaseClubIdentityAdapter'

export type ClubIdentityPort = IdentityDirectoryPort & IdentityAccountProvisioningPort

export function createClubIdentityAdapter(
  env: NodeJS.ProcessEnv = process.env,
): ClubIdentityPort {
  const baseUrl = env.IDENTITY_SERVICE_URL
  const apiKey = env.IDENTITY_SERVICE_API_KEY
  const mode = selectDomainBoundaryMode({
    boundary: 'club-hub->identity',
    baseUrl,
    apiKey,
    requireHttp: env.DOMAIN_BOUNDARY_REQUIRE_HTTP === 'true',
  })
  if (mode === 'shared-db') return new SharedDatabaseClubIdentityAdapter()
  return new IdentityHttpClient({ baseUrl: baseUrl!, apiKey: apiKey! })
}
