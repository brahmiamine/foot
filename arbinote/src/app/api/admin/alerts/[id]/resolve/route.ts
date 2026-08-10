import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { VoteAlert } from '@/lib/entities'
import { toPlain } from '@/lib/serialization'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

/**
 * POST /api/admin/alerts/[id]/resolve
 * Marque une alerte comme résolue
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

    alert.status = 'resolved'
    alert.reviewed_at = new Date()
    alert.notes = notes || null
    // TODO: Récupérer l'ID de l'admin depuis la session
    // alert.reviewed_by = adminId

    await alertRepo.save(alert)

    await logAdminAction({ request, action: 'update', entityType: 'alert', entityId: id, summary: 'Alerte résolue' })

    return NextResponse.json(toPlain(alert))
  } catch (error) {
    console.error('Unexpected error in /api/admin/alerts/[id]/resolve:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

