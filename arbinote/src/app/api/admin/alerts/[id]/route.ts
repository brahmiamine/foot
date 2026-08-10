import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { VoteAlert } from '@/lib/entities'
import { toPlain } from '@/lib/serialization'

export const runtime = 'nodejs'

/**
 * GET /api/admin/alerts/[id]
 * Récupère les détails d'une alerte
 * Protégé par authentification admin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params

    const dataSource = await getDataSource()
    const alertRepo = dataSource.getRepository<VoteAlert>('vote_alerts')

    const alert = await alertRepo.findOne({
      where: { id },
      relations: ['match'],
    })

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(toPlain(alert))
  } catch (error) {
    console.error('Unexpected error in /api/admin/alerts/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

