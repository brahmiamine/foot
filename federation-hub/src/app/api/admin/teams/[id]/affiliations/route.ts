import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getAdminSession, canAccessFederation, canAccessLeague, ensureFederationAccess } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { changeAffiliation, listAffiliations, TeamAffiliationError } from '@/lib/teamAffiliations'
import { toPlain, toPlainArray } from '@/lib/serialization'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

/**
 * migration.md §6/§9 : historique d'affiliation d'un club. Lecture ouverte
 * à tout rôle admin scopé qui a un lien, actuel OU passé, avec ce club
 * (comme pour la fédération ciblée par une écriture, jamais uniquement le
 * scope revendiqué côté client) — un LEAGUE_ADMIN/FEDERATION_ADMIN qui n'a
 * plus aucun lien avec ce club dans son historique est refusé.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params

  const session = await getAdminSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const dataSource = await getDataSource()
    const affiliations = await listAffiliations(dataSource, teamId)

    const hasAccess = affiliations.some(
      (a) => canAccessFederation(session, a.federationId) || (a.leagueId && canAccessLeague(session, a.leagueId, a.federationId)),
    )
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(toPlainArray(affiliations))
  } catch (error) {
    console.error('Error fetching team affiliations:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 })
  }
}

/**
 * Rattache le club à une fédération/ligue/saison (migration.md §6) —
 * clôture automatiquement l'affiliation ACTIVE précédente s'il y en a une
 * (promotion/relégation/changement de ligue). Seul PLATFORM_SUPERADMIN ou
 * le FEDERATION_ADMIN de la fédération CIBLE peut le faire — c'est un droit
 * de niveau fédération (migration.md §9 : "gérer les clubs affiliés").
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params

  try {
    const body = await request.json()
    const { federation_id, league_id, saison_id, start_date, notes } = body

    if (!federation_id || !start_date) {
      return NextResponse.json({ error: 'federation_id et start_date sont requis' }, { status: 400 })
    }

    const unauthorized = await ensureFederationAccess(request, federation_id)
    if (unauthorized) return unauthorized

    const session = await getAdminSession(request)
    const dataSource = await getDataSource()

    const affiliation = await changeAffiliation(dataSource, {
      teamId,
      federationId: federation_id,
      leagueId: league_id ?? null,
      saisonId: saison_id ?? null,
      startDate: start_date,
      notes: notes ?? null,
      createdBy: session?.email ?? null,
    })

    await logAdminAction({
      request,
      action: 'create',
      entityType: 'team_affiliation',
      entityId: affiliation.id,
      summary: `Club ${teamId} affilié à ${federation_id}${league_id ? ` / ${league_id}` : ''} à partir du ${start_date}`,
    })

    return NextResponse.json(toPlain(affiliation), { status: 201 })
  } catch (error) {
    if (error instanceof TeamAffiliationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error changing team affiliation:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}
