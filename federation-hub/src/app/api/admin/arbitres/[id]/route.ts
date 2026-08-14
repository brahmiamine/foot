import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { canAccessFederation, canAccessPlatform, getAdminSession } from '@/lib/adminAuth'
import { ArbitreInput, updateArbitre } from '@/lib/adminArbitres'
import { getDataSource } from '@/lib/db'
import { Arbitre, League } from '@/lib/entities'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'LEAGUE_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { id } = await params
    const payload = (await request.json()) as ArbitreInput
    const dataSource = await getDataSource()
    const existing = await dataSource.getRepository(Arbitre).findOne({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Arbitre non trouvé' }, { status: 404 })
    if (!canAccessPlatform(session)) {
      if (!existing.federation_id || !canAccessFederation(session, existing.federation_id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      payload.federation_id = session.federationId
      if (payload.league_id) {
        const league = await dataSource.getRepository(League).findOne({ where: { id: payload.league_id } })
        if (!league || league.federation_id !== session.federationId) {
          return NextResponse.json({ error: 'Ligue hors périmètre' }, { status: 403 })
        }
      }
    }
    const arbitre = await updateArbitre(id, payload)
    await logAdminAction({ request, action: 'update', entityType: 'arbitre', entityId: id, summary: arbitre.nom })
    return NextResponse.json(arbitre)
  } catch (error) {
    console.error('Error updating arbitre:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'LEAGUE_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { id } = await params
    const dataSource = await getDataSource()
    const repo = dataSource.getRepository<Arbitre>('arbitres')
    const arbitre = await repo.findOne({ where: { id } })

    if (!arbitre) {
      return NextResponse.json({ error: 'Arbitre non trouvé' }, { status: 404 })
    }
    if (!canAccessPlatform(session) && (!arbitre.federation_id || !canAccessFederation(session, arbitre.federation_id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    arbitre.is_active = false
    arbitre.status = 'INACTIVE'
    await repo.save(arbitre)
    await logAdminAction({ request, action: 'update', entityType: 'arbitre', entityId: id, summary: `${arbitre.nom} désactivé` })
    return NextResponse.json({ success: true, deactivated: true })
  } catch (error) {
    console.error('Error deleting arbitre:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}
