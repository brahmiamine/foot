import type {
  IdentityAccountProvisioningPort,
  IdentityDirectoryPort,
} from '../../../../packages/domain-contracts/src/identity'
import { IdentityHttpClient } from '../../../../packages/identity-client/src'
import { SharedDatabaseClubIdentityAdapter } from './SharedDatabaseClubIdentityAdapter'

export type ClubIdentityPort = IdentityDirectoryPort & IdentityAccountProvisioningPort

/**
 * Transitional composition root for Identity-owned club accounts.
 * Both service variables absent => shared DB adapter; both present => HTTP;
 * partial configuration is rejected.
 */
export function createClubIdentityAdapter(
  env: NodeJS.ProcessEnv = process.env,
): ClubIdentityPort {
  const baseUrl = env.IDENTITY_SERVICE_URL
  const apiKey = env.IDENTITY_SERVICE_API_KEY

  if (!baseUrl && !apiKey) return new SharedDatabaseClubIdentityAdapter()

  if (!baseUrl || !apiKey) {
    throw new Error('IDENTITY_SERVICE_URL and IDENTITY_SERVICE_API_KEY must be configured together')
  }

  return new IdentityHttpClient({ baseUrl, apiKey })
}
