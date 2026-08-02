import { NextResponse } from 'next/server'
import { fetchMatchById } from '@/lib/dataAccess'
import { enforcePublicRateLimit } from '@/lib/publicRateLimit'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = enforcePublicRateLimit(request, 'match-detail')
  if (limited) return limited

  try {
    const { id: matchId } = await params

    const match = await fetchMatchById(matchId)

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    return NextResponse.json(match)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

