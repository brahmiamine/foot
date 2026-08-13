import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { Vote } from '@/lib/entities'
import { toPlain } from '@/lib/serialization'
import { logAdminAction } from '@/lib/auditLog'
import { getSsoSessionFromRequest } from '@/lib/ssoSession'

export const runtime = 'nodejs'

/**
 * POST /api/admin/votes/moderate/[voteId]
 * Modère un vote individuellement (valider ou exclure)
 * Protégé par authentification admin
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ voteId: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  const admin = await getSsoSessionFromRequest(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { voteId } = await params
    const body = await request.json()
    const { action, notes } = body // action: 'validate' | 'exclude'

    if (!action || (action !== 'validate' && action !== 'exclude')) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "validate" or "exclude"' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()
    const voteRepo = dataSource.getRepository<Vote>('votes')

    const vote = await voteRepo.findOne({
      where: { id: voteId },
    })

    if (!vote) {
      return NextResponse.json(
        { error: 'Vote not found' },
        { status: 404 }
      )
    }

    // Mettre à jour le statut de modération
    vote.moderation_status = action === 'validate' ? 'validated' : 'excluded'
    vote.moderated_at = new Date()
    vote.moderation_notes = notes || null
    vote.moderated_by = admin.id

    await voteRepo.save(vote)

    await logAdminAction({
      request,
      action: 'moderate',
      entityType: 'vote',
      entityId: voteId,
      summary: `Statut → ${vote.moderation_status} (par ${admin.email})`,
      adminUsername: admin.email,
    })

    return NextResponse.json(toPlain(vote))
  } catch (error) {
    console.error('Unexpected error in /api/admin/votes/moderate/[voteId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}





