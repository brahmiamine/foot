import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getSsoSessionFromRequest } from '@/lib/ssoSession'
import { getDataSource } from '@/lib/db'
import { VoteAlert } from '@/lib/entities'
import { toPlain } from '@/lib/serialization'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

/**
 * POST /api/admin/alerts/[id]/dismiss
 * Ignore une alerte (faux positif)
 * Protégé par authentification admin
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const body = await request.json()
    const { notes } = body

    const dataSource = await getDataSource()
    const alertRepo = dataSource.getRepository<VoteAlert>('vote_alerts')

    const alert = await alertRepo.findOne({
      where: { id },
    })

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      )
    }

    const session = await getSsoSessionFromRequest(request)
    const previousStatus = alert.status

    alert.status = 'dismissed'
    alert.reviewed_at = new Date()
    alert.reviewed_by = session?.id ?? null
    alert.notes = notes || null

    await alertRepo.save(alert)

    // Résumé structuré (état précédent -> nouvel état, motif) consommé par
    // l'historique de modération de l'alerte (US-40, voir
    // /api/admin/alerts/[id]/history) — audit_logs reste la seule source de
    // vérité pour la trace des transitions, vote_alerts ne garde que la dernière.
    await logAdminAction({
      request,
      action: 'update',
      entityType: 'alert',
      entityId: id,
      summary: `Alerte ${previousStatus} → dismissed${notes ? ` — Motif : ${notes}` : ''}`,
    })

    return NextResponse.json(toPlain(alert))
  } catch (error) {
    console.error('Unexpected error in /api/admin/alerts/[id]/dismiss:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

