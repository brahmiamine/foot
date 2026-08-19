import type { IdentityMemberRegistrationAdminPort } from '../../../../packages/domain-contracts/src/identity'
import { IdentityHttpClient } from '../../../../packages/identity-client/src'

/** Identity reste propriétaire des credentials, jetons et décisions d'inscription MEMBER. */
export function createClubIdentityMemberRegistrationAdapter(
  env: NodeJS.ProcessEnv = process.env,
): IdentityMemberRegistrationAdminPort {
  const baseUrl = env.IDENTITY_SERVICE_URL
  const apiKey = env.IDENTITY_SERVICE_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Le service Identity doit être configuré (IDENTITY_SERVICE_URL / IDENTITY_SERVICE_API_KEY) pour administrer les inscriptions membre",
    )
  }
  return new IdentityHttpClient({ baseUrl, apiKey })
}
