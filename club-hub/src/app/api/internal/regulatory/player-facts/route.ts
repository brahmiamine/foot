import { NextRequest, NextResponse } from 'next/server'
import { ensureServiceAuth } from '@/lib/serviceAuth'
import { PlayerRegulatoryFactsService } from '@/services/PlayerRegulatoryFactsService'

export async function GET(request: NextRequest) {
  const authError = ensureServiceAuth(request)
  if (authError) return authError

  const playerId = request.nextUrl.searchParams.get('playerId')?.trim()
  const clubId = request.nextUrl.searchParams.get('clubId')?.trim()
  const at = request.nextUrl.searchParams.get('at')?.trim()
  if (!playerId || !clubId || !at) {
    return NextResponse.json({ error: 'playerId, clubId and at are required' }, { status: 400 })
  }

  try {
    const facts = await new PlayerRegulatoryFactsService().getPlayerRegulatoryFacts({
      playerId,
      clubId,
      at,
    })
    return NextResponse.json(facts)
  } catch (error) {
    if (error instanceof Error && error.message === 'Date de référence invalide') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[club-hub] player regulatory facts failed', error)
    return NextResponse.json({ error: 'Player regulatory facts failed' }, { status: 500 })
  }
}
