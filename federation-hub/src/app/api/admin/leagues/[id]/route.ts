import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth, getAdminSession, canAccessLeague, canAccessFederation } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { League } from '@/lib/entities'
import { toPlain } from '@/lib/serialization'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params

    const dataSource = await getDataSource()
    const repo = dataSource.getRepository<League>('ligues')
    const league = await repo.findOne({ 
      where: { id },
      relations: ['federation'],
    })

    if (!league) {
      return NextResponse.json({ error: 'Ligue non trouvée' }, { status: 404 })
    }

    return NextResponse.json(toPlain(league))
  } catch (error) {
    console.error('Error fetching league:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const dataSource = await getDataSource()
    const federationRepo = dataSource.getRepository('federations')
    const leagueRepo = dataSource.getRepository<League>('ligues')

    const league = await leagueRepo.findOne({ where: { id } })
    if (!league) {
      return NextResponse.json({ error: 'Ligue non trouvée' }, { status: 404 })
    }

    const session = await getAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // migration.md §9 : accès vérifié sur la fédération/ligue ACTUELLE de la
    // ressource, pas sur celle envoyée dans le corps de la requête — sinon
    // un LEAGUE_ADMIN pourrait revendiquer l'accès en fournissant n'importe
    // quel federation_id.
    if (!canAccessLeague(session, id, league.federation_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { federation_id, nom, nom_en, nom_ar, logo_url } = body

    if (!federation_id || !nom) {
      return NextResponse.json(
        { error: 'Fédération et nom sont requis' },
        { status: 400 }
      )
    }

    // Vérifier que la fédération existe
    const federation = await federationRepo.findOne({ where: { id: federation_id } })
    if (!federation) {
      return NextResponse.json(
        { error: 'Fédération non trouvée' },
        { status: 400 }
      )
    }

    // Rattacher la ligue à une AUTRE fédération est une action de niveau
    // fédération, pas de niveau ligue : un LEAGUE_ADMIN ne peut jamais la
    // faire, un FEDERATION_ADMIN seulement si la fédération cible est
    // aussi la sienne (donc jamais vers une fédération tierce).
    if (federation_id !== league.federation_id && !canAccessFederation(session, federation_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    league.federation_id = federation_id
    league.nom = nom
    league.nom_en = nom_en || null
    league.nom_ar = nom_ar || null
    league.logo_url = logo_url || null

    const saved = await leagueRepo.save(league)
    await logAdminAction({ request, action: 'update', entityType: 'league', entityId: id, summary: saved.nom })
    return NextResponse.json(toPlain(saved))
  } catch (error) {
    console.error('Error updating league:', error)
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
  const { id } = await params

  try {
    const dataSource = await getDataSource()
    const repo = dataSource.getRepository<League>('ligues')
    const league = await repo.findOne({ where: { id } })

    if (!league) {
      return NextResponse.json({ error: 'Ligue non trouvée' }, { status: 404 })
    }

    const session = await getAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!canAccessLeague(session, id, league.federation_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await repo.remove(league)
    await logAdminAction({ request, action: 'delete', entityType: 'league', entityId: id, summary: league.nom })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting league:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}

