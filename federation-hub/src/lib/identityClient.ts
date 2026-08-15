import type {
  CreateIdentityAccountInput,
  IdentityRole,
  IdentityUserRecord,
  IdentityUserSearch,
} from '../../../packages/domain-contracts/src/identity'
import {
  IdentityClientError,
  IdentityHttpClient,
} from '../../../packages/identity-client/src/index'

export type IdentityUserRole = IdentityRole
export type IdentityUser = IdentityUserRecord
export type CreateIdentityUserInput = CreateIdentityAccountInput

function client(): IdentityHttpClient {
  const baseUrl = process.env.SSO_URL
  const apiKey = process.env.SSO_SERVICE_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('SSO_URL et SSO_SERVICE_API_KEY doivent être configurés.')
  }
  return new IdentityHttpClient({ baseUrl, apiKey })
}

export type CreateIdentityUserResult =
  | { ok: true; user: IdentityUser }
  | { ok: false; error: 'email_taken' }

export async function createIdentityUser(
  input: CreateIdentityUserInput,
): Promise<CreateIdentityUserResult> {
  try {
    return { ok: true, user: await client().createUser(input) }
  } catch (error) {
    if (error instanceof IdentityClientError && error.status === 409) {
      return { ok: false, error: 'email_taken' }
    }
    throw error
  }
}

export function getIdentityUserByEmail(email: string): Promise<IdentityUser | null> {
  return client().getUserByEmail(email)
}

export function listIdentityUsers(search: IdentityUserSearch = {}): Promise<IdentityUser[]> {
  return client().listUsers(search)
}

export interface UpdateIdentityUserInput {
  isActive?: boolean
  role?: 'ADMIN' | 'OBSERVATEUR'
  password?: string
}

export function updateIdentityUser(
  id: string,
  input: UpdateIdentityUserInput,
): Promise<IdentityUser> {
  return client().updateUser(id, input)
}

export function deleteIdentityUser(id: string): Promise<void> {
  return client().deleteUser(id)
}
