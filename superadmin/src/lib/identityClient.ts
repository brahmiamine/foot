/**
 * Client HTTP vers `sso` (`/api/internal/users/*`). Authentification par clé
 * de service (`x-api-key`), jamais par une session SSO — même pattern que
 * `matchsheetClient.ts` (TS-31). Remplace les écritures directes TypeORM
 * que `clubAccounts.ts`/`staffInvitations.ts` faisaient jusqu'ici dans
 * `User` (TS-53, avancement.md, Epic E17) : `sso` reste seul propriétaire
 * de cette table (voir TS-30).
 */

export interface IdentityUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'OBSERVATEUR' | 'SUPERADMIN' | 'MEMBER'
  isActive: boolean
  teamId: string | null
  createdAt: string
}

class IdentityClientError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.SSO_URL
  const apiKey = process.env.SSO_SERVICE_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('SSO_URL et SSO_SERVICE_API_KEY doivent être configurés.')
  }
  return { baseUrl, apiKey }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl, apiKey } = getConfig()
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(5000),
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    const message = (body as { error?: string })?.error ?? `sso a répondu ${response.status}`
    throw new IdentityClientError(message, response.status)
  }
  return body as T
}

export interface CreateIdentityUserInput {
  name: string
  email: string
  password: string
  role: 'ADMIN' | 'OBSERVATEUR'
  teamId: string
}

export type CreateIdentityUserResult =
  | { ok: true; user: IdentityUser }
  | { ok: false; error: 'email_taken' }

export async function createIdentityUser(input: CreateIdentityUserInput): Promise<CreateIdentityUserResult> {
  try {
    const user = await call<IdentityUser>('/api/internal/users', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return { ok: true, user }
  } catch (error) {
    if (error instanceof IdentityClientError && error.status === 409) {
      return { ok: false, error: 'email_taken' }
    }
    throw error
  }
}

/**
 * TASK-P0-013 (todo.md) : utilisé par `staffInvitations.acceptInvitation`
 * pour distinguer, après un `email_taken` sur `createIdentityUser`, un vrai
 * conflit d'un retry idempotent (le compte a bien été créé côté sso, mais
 * la confirmation locale — `invitation.acceptedAt` — n'a pas pu être
 * persistée avant l'échec).
 */
export async function getIdentityUserByEmail(email: string): Promise<IdentityUser | null> {
  try {
    return await call<IdentityUser>(`/api/internal/users?email=${encodeURIComponent(email)}`)
  } catch (error) {
    if (error instanceof IdentityClientError && error.status === 404) {
      return null
    }
    throw error
  }
}

export interface UpdateIdentityUserInput {
  isActive?: boolean
  role?: 'ADMIN' | 'OBSERVATEUR'
  password?: string
}

export async function updateIdentityUser(id: string, input: UpdateIdentityUserInput): Promise<IdentityUser> {
  return call<IdentityUser>(`/api/internal/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteIdentityUser(id: string): Promise<void> {
  await call<{ success: true }>(`/api/internal/users/${id}`, { method: 'DELETE' })
}
