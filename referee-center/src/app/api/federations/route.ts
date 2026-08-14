import { NextRequest, NextResponse } from 'next/server'
import { fetchFederationsWithLeagues } from '@/lib/dataAccess'
import { enforcePublicRateLimit } from '@/lib/publicRateLimit'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const limited = enforcePublicRateLimit(request, 'federations')
  if (limited) return limited

  try {
    const federations = await fetchFederationsWithLeagues()
    return NextResponse.json(federations)
  } catch (error) {
    console.error('Error fetching federations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

