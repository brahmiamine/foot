import { NextRequest, NextResponse } from 'next/server'

/**
 * Service-to-service authentication for federation-hub internal APIs.
 * User SSO tokens are intentionally not accepted on this boundary.
 */
export function ensureFederationServiceAuth(request: NextRequest): NextResponse | null {
  const expected = process.env.FEDERATION_REGULATORY_SERVICE_API_KEY
  if (!expected) {
    return NextResponse.json({ error: 'Federation regulatory API not configured' }, { status: 503 })
  }

  const provided = request.headers.get('x-api-key')
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
