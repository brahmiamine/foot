import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getSsoSessionFromRequest } from '@/lib/ssoSession'
import { transferPlayer } from '@/lib/adminPlayerTransfers'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

/**
 * Transfère un joueur ([id]) vers un autre club. Voir
 * lib/adminPlayerTransfers.ts#transferPlayer — écrit `Player.teamId` (table
 * teamManager) et journalise dans `player_transfers`.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const session = await getSsoSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const toTeamId = typeof body.toTeamId === 'string' ? body.toTeamId : ''
    const note = typeof body.note === 'string' ? body.note : null
    if (!toTeamId) {
      return NextResponse.json({ error: 'Club de destination requis.' }, { status: 400 })
    }

    const transfer = await transferPlayer({ playerId: id, toTeamId, note, performedBy: session.id })

    await logAdminAction({
      request,
      action: 'transfer',
      entityType: 'player',
      entityId: id,
      summary: `${transfer.playerNameFr} : ${transfer.fromTeamId} → ${transfer.toTeamId}${note ? ` | Motif : ${note}` : ''}`,
    })

    return NextResponse.json(transfer, { status: 201 })
  } catch (error) {
    console.error('Error transferring player:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}
