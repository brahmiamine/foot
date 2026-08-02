import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { safeErrorMessage } from '@/lib/apiError'
import { API_FOOTBALL_ENDPOINTS, callApiFootball, isApiFootballEndpoint } from '@/lib/apiFootball'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint') ?? ''

  if (!isApiFootballEndpoint(endpoint)) {
    return NextResponse.json(
      { error: `Endpoint invalide. Autorisés: ${API_FOOTBALL_ENDPOINTS.join(', ')}` },
      { status: 400 }
    )
  }

  const params: Record<string, string> = {}
  for (const [key, value] of searchParams.entries()) {
    if (key === 'endpoint') continue
    params[key] = value
  }

  try {
    const result = await callApiFootball(endpoint, params)
    return NextResponse.json(result, { status: result.ok ? 200 : result.status })
  } catch (error) {
    console.error('API-Football test error:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 })
  }
}
