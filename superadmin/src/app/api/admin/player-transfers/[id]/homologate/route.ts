import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession, canAccessFederation, canAccessPlatform } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { getActiveAffiliation } from '@/lib/teamAffiliations'
import { completePlayerTransfer, listPlayerTransfers, PlayerTransferClientError } from '@/lib/playerTransferClient'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const transfer = (await listPlayerTransfers()).find((item) => item.id === id)
    if (!transfer) return NextResponse.json({ error: 'Transfert introuvable' }, { status: 404 })
    if (transfer.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Le club destination doit approuver le transfert avant homologation.' }, { status: 409 })
    }

    const dataSource = await getDataSource()
    const affiliation = await getActiveAffiliation(dataSource, transfer.fromTeamId)
    if (!affiliation) {
      if (!canAccessPlatform(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } else if (!canAccessFederation(session, affiliation.federationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const completed = await completePlayerTransfer(id, session.email)
    await logAdminAction({
      request,
      action: 'update',
      entityType: 'player_transfer',
      entityId: id,
      summary: `Homologation du transfert ${id}`,
    })
    return NextResponse.json(completed)
  } catch (error) {
    if (error instanceof PlayerTransferClientError) return NextResponse.json({ error: error.message }, { status: 400 })
    console.error('Error homologating transfer:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
