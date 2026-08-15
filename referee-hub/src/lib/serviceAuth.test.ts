import { afterEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { ensureRefereeServiceAuth } from './serviceAuth'

const originalKey = process.env.REFEREE_HUB_SERVICE_API_KEY

afterEach(() => {
  if (originalKey === undefined) delete process.env.REFEREE_HUB_SERVICE_API_KEY
  else process.env.REFEREE_HUB_SERVICE_API_KEY = originalKey
})

describe('ensureRefereeServiceAuth', () => {
  it('fails closed when the service API key is not configured', () => {
    delete process.env.REFEREE_HUB_SERVICE_API_KEY
    const request = new NextRequest('http://localhost/api/internal/availability/check')

    expect(ensureRefereeServiceAuth(request)?.status).toBe(503)
  })

  it('rejects an invalid service key', () => {
    process.env.REFEREE_HUB_SERVICE_API_KEY = 'expected-key'
    const request = new NextRequest('http://localhost/api/internal/availability/check', {
      headers: { 'x-api-key': 'wrong-key' },
    })

    expect(ensureRefereeServiceAuth(request)?.status).toBe(401)
  })

  it('accepts the configured service key', () => {
    process.env.REFEREE_HUB_SERVICE_API_KEY = 'expected-key'
    const request = new NextRequest('http://localhost/api/internal/availability/check', {
      headers: { 'x-api-key': 'expected-key' },
    })

    expect(ensureRefereeServiceAuth(request)).toBeNull()
  })
})
