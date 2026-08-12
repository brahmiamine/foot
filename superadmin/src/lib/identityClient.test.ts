import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const envBackup = { ...process.env }

beforeEach(() => {
  process.env.SSO_URL = 'http://sso.internal'
  process.env.SSO_SERVICE_API_KEY = 'test-service-key'
})

afterEach(() => {
  process.env = { ...envBackup }
  vi.unstubAllGlobals()
})

/** TS-53 (Epic E17) — client HTTP vers sso/internal/users. */
describe('identityClient', () => {
  it('throws when SSO_URL/SSO_SERVICE_API_KEY are not configured', async () => {
    delete process.env.SSO_URL
    const { updateIdentityUser } = await import('./identityClient')

    await expect(updateIdentityUser('user-1', { isActive: false })).rejects.toThrow(/SSO_URL/)
  })

  it('createIdentityUser sends the payload with x-api-key and returns the created user', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 'user-1', email: 'a@example.com', isActive: true }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const { createIdentityUser } = await import('./identityClient')

    const result = await createIdentityUser({
      name: 'Amine',
      email: 'a@example.com',
      password: 's3cret!',
      role: 'ADMIN',
      teamId: 'team-1',
    })

    expect(result).toEqual({ ok: true, user: { id: 'user-1', email: 'a@example.com', isActive: true } })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://sso.internal/api/internal/users')
    expect(init.headers['x-api-key']).toBe('test-service-key')
  })

  it('createIdentityUser maps a 409 response to email_taken', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'email_taken' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const { createIdentityUser } = await import('./identityClient')

    const result = await createIdentityUser({
      name: 'Amine',
      email: 'a@example.com',
      password: 's3cret!',
      role: 'ADMIN',
      teamId: 'team-1',
    })

    expect(result).toEqual({ ok: false, error: 'email_taken' })
  })

  it('updateIdentityUser PATCHes and returns the updated user', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 'user-1', isActive: false }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const { updateIdentityUser } = await import('./identityClient')

    const result = await updateIdentityUser('user-1', { isActive: false })

    expect(result).toEqual({ id: 'user-1', isActive: false })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://sso.internal/api/internal/users/user-1')
    expect(init.method).toBe('PATCH')
  })

  it('deleteIdentityUser throws with the not_found message on a 404', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'not_found' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const { deleteIdentityUser } = await import('./identityClient')

    await expect(deleteIdentityUser('user-1')).rejects.toThrow('not_found')
  })
})
