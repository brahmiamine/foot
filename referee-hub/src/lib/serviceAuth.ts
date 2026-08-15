import { NextRequest, NextResponse } from 'next/server'

/**
 * Authentication for referee-hub internal APIs. These endpoints are consumed
 * by other deployables and never rely on an end-user SSO session.
 */
export function ensureRefereeServiceAuth(request: NextRequest): NextResponse | null {
  const expected = process.env.REFEREE_HUB_SERVICE_API_KEY
  if (!expected) {
    return NextResponse.json({ error: 'Service API not configured' }, { status: 503 })
  }

  const provided = request.headers.get('x-api-key')
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
