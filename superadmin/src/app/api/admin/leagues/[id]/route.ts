import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
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
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const body = await request.json()
    const { federation_id, nom, nom_en, nom_ar, logo_url } = body

    if (!federation_id || !nom) {
      return NextResponse.json(
        { error: 'Fédération et nom sont requis' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()
    const federationRepo = dataSource.getRepository('federations')
    const leagueRepo = dataSource.getRepository<League>('ligues')
    
    // Vérifier que la fédération existe
    const federation = await federationRepo.findOne({ where: { id: federation_id } })
    if (!federation) {
      return NextResponse.json(
        { error: 'Fédération non trouvée' },
        { status: 400 }
      )
    }

    const league = await leagueRepo.findOne({ where: { id } })
    if (!league) {
      return NextResponse.json({ error: 'Ligue non trouvée' }, { status: 404 })
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
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params

    const dataSource = await getDataSource()
    const repo = dataSource.getRepository<League>('ligues')
    const league = await repo.findOne({ where: { id } })

    if (!league) {
      return NextResponse.json({ error: 'Ligue non trouvée' }, { status: 404 })
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

