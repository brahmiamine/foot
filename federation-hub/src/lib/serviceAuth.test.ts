import { afterEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { ensureFederationServiceAuth } from './serviceAuth'

const originalKey = process.env.FEDERATION_REGULATORY_SERVICE_API_KEY

afterEach(() => {
  if (originalKey === undefined) delete process.env.FEDERATION_REGULATORY_SERVICE_API_KEY
  else process.env.FEDERATION_REGULATORY_SERVICE_API_KEY = originalKey
})

describe('ensureFederationServiceAuth', () => {
  it('fails closed when the service API key is not configured', () => {
    delete process.env.FEDERATION_REGULATORY_SERVICE_API_KEY
    const request = new NextRequest('http://localhost/api/internal/regulatory/eligibility/player')

    const response = ensureFederationServiceAuth(request)

    expect(response?.status).toBe(503)
  })

  it('rejects an invalid service key', () => {
    process.env.FEDERATION_REGULATORY_SERVICE_API_KEY = 'expected-key'
    const request = new NextRequest('http://localhost/api/internal/regulatory/eligibility/player', {
      headers: { 'x-api-key': 'wrong-key' },
    })

    const response = ensureFederationServiceAuth(request)

    expect(response?.status).toBe(401)
  })

  it('accepts the configured service key', () => {
    process.env.FEDERATION_REGULATORY_SERVICE_API_KEY = 'expected-key'
    const request = new NextRequest('http://localhost/api/internal/regulatory/eligibility/player', {
      headers: { 'x-api-key': 'expected-key' },
    })

    expect(ensureFederationServiceAuth(request)).toBeNull()
  })
})
