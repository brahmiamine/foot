import type { IdentityPlayerInvitationPort } from '../../../../packages/domain-contracts/src/identity'
import { IdentityHttpClient } from '../../../../packages/identity-client/src'

/**
 * Les invitations nécessitent Identity (token + email + credential lifecycle)
 * et ne disposent volontairement d'aucun fallback shared-DB.
 */
export function createClubIdentityInvitationAdapter(
  env: NodeJS.ProcessEnv = process.env,
): IdentityPlayerInvitationPort {
  const baseUrl = env.IDENTITY_SERVICE_URL
  const apiKey = env.IDENTITY_SERVICE_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Le service Identity doit être configuré (IDENTITY_SERVICE_URL / IDENTITY_SERVICE_API_KEY) pour inviter un joueur",
    )
  }
  return new IdentityHttpClient({ baseUrl, apiKey })
}
