import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { listPlayersForTeam } from '@/lib/players'

export const runtime = 'nodejs'

/**
 * GET /api/admin/teams/:id/players — effectif (lecture seule) d'un club,
 * utilisé par le sélecteur `player_id` de l'écran Transferts (migration.md
 * §18-19).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id: teamId } = await params
    const players = await listPlayersForTeam(teamId)
    return NextResponse.json(players)
  } catch (error) {
    console.error('Error fetching team players:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
