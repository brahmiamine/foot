import { afterEach, describe, expect, it, vi } from 'vitest'
import { safeErrorMessage } from './apiError'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('safeErrorMessage', () => {
  it('returns the real error message outside production', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(safeErrorMessage(new Error('DB connection refused'))).toBe('DB connection refused')
  })

  it('stringifies non-Error values outside production', () => {
    vi.stubEnv('NODE_ENV', 'test')
    expect(safeErrorMessage('boom')).toBe('boom')
    expect(safeErrorMessage({ code: 'ECONNREFUSED' })).toBe('[object Object]')
  })

  it('hides the real error message in production and returns the fallback', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(safeErrorMessage(new Error('DB connection refused'))).toBe('Erreur serveur')
  })

  it('honors a custom fallback in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(safeErrorMessage(new Error('leak me not'), 'Action impossible')).toBe('Action impossible')
  })

  it('never leaks the original message in production, even for non-Error values', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(safeErrorMessage('some internal detail')).toBe('Erreur serveur')
  })
})
