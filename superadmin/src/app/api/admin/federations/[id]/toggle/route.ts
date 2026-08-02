import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { Federation, League } from '@/lib/entities'
import { toPlain } from '@/lib/serialization'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const { is_active } = await request.json()

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active doit être un booléen' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()
    const repo = dataSource.getRepository<Federation>('federations')
    const leagueRepo = dataSource.getRepository<League>('ligues')
    
    const federation = await repo.findOne({ where: { id } })
    if (!federation) {
      return NextResponse.json({ error: 'Fédération non trouvée' }, { status: 404 })
    }

    federation.is_active = is_active
    await repo.save(federation)

    // Si la fédération est désactivée, désactiver automatiquement toutes ses ligues
    if (!is_active) {
      const leagues = await leagueRepo.find({ where: { federation_id: id } })
      for (const league of leagues) {
        league.is_active = false
        await leagueRepo.save(league)
      }
    }

    await logAdminAction({
      request,
      action: 'toggle',
      entityType: 'federation',
      entityId: id,
      summary: `${federation.nom} → ${is_active ? 'activée' : 'désactivée'}`,
    })

    return NextResponse.json({
      success: true,
      federation: toPlain(federation)
    })
  } catch (error) {
    console.error('Error toggling federation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

