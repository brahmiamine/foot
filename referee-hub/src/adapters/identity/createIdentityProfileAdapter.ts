import type { IdentityProfilePort } from '../../../../packages/domain-contracts/src/identity'
import { IdentityHttpClient } from '../../../../packages/identity-client/src'
import { SharedDatabaseIdentityProfileAdapter } from './SharedDatabaseIdentityProfileAdapter'

/**
 * Transitional composition root for Identity-owned profile data.
 * - no dedicated service config: keep the shared-DB read adapter;
 * - complete config: call Identity over HTTP;
 * - partial config: fail closed instead of silently bypassing Identity.
 */
export function createIdentityProfileAdapter(
  env: NodeJS.ProcessEnv = process.env,
): IdentityProfilePort {
  const baseUrl = env.IDENTITY_SERVICE_URL
  const apiKey = env.IDENTITY_SERVICE_API_KEY

  if (!baseUrl && !apiKey) return new SharedDatabaseIdentityProfileAdapter()

  if (!baseUrl || !apiKey) {
    throw new Error('IDENTITY_SERVICE_URL and IDENTITY_SERVICE_API_KEY must be configured together')
  }

  return new IdentityHttpClient({ baseUrl, apiKey })
}
