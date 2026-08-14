import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { canAccessFederation, canAccessPlatform, getAdminSession } from '@/lib/adminAuth'
import { ArbitreInput, createArbitre, listArbitres } from '@/lib/adminArbitres'
import { logAdminAction } from '@/lib/auditLog'
import { getDataSource } from '@/lib/db'
import { League } from '@/lib/entities'

export const runtime = 'nodejs'

/** Lecture ouverte à FEDERATION_ADMIN (référentiel arbitres, non sensible — sélecteur de l'écran officiels de match). */
export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const arbitres = await listArbitres({
      federationId: session.role === 'FEDERATION_ADMIN' ? session.federationId : null,
      leagueId: session.role === 'LEAGUE_ADMIN' ? session.leagueId : null,
    })
    return NextResponse.json(arbitres)
  } catch (error) {
    console.error('Error fetching arbitres for admin:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'LEAGUE_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const payload = (await request.json()) as ArbitreInput
    if (!canAccessPlatform(session)) {
      if (!session.federationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      payload.federation_id = session.federationId
      if (payload.league_id) {
        const league = await (await getDataSource()).getRepository(League).findOne({ where: { id: payload.league_id } })
        if (!league || league.federation_id !== session.federationId) {
          return NextResponse.json({ error: 'Ligue hors périmètre' }, { status: 403 })
        }
      }
    } else if (payload.federation_id && !canAccessFederation(session, payload.federation_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const arbitre = await createArbitre(payload)
    await logAdminAction({ request, action: 'create', entityType: 'arbitre', entityId: arbitre.id, summary: arbitre.nom })
    return NextResponse.json(arbitre, { status: 201 })
  } catch (error) {
    console.error('Error creating arbitre:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}
