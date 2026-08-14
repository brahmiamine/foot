import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getAdminSession, canAccessFederation, canAccessPlatform } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { League } from '@/lib/entities'
import { createInvitation, listStaffInvitations, type CreateInvitationInput } from '@/lib/staffInvitations'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

/**
 * GET /api/admin/staff-invitations — liste des invitations fédération/
 * ligue/officiels envoyées (migration.md §0), pour l'écran de provisioning.
 * Ouvert à PLATFORM_SUPERADMIN (liste complète) et FEDERATION_ADMIN (liste
 * filtrée à sa fédération, voir `listStaffInvitations`) — même périmètre
 * que le POST.
 */
export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session || !(canAccessPlatform(session) || session.role === 'FEDERATION_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const scopeFederationId = canAccessPlatform(session) ? null : session.federationId
    const invitations = await listStaffInvitations(scopeFederationId)
    return NextResponse.json(invitations)
  } catch (error) {
    console.error('Error listing staff invitations:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 })
  }
}

/**
 * POST /api/admin/staff-invitations — migration.md §0 (provisioning),
 * complète `/api/admin/club/:teamId/invitations` (ADMIN/OBSERVATEUR d'un
 * club, inchangée) pour les rôles cibles du modèle Fédération/Ligue/Club :
 * FEDERATION_ADMIN, LEAGUE_ADMIN, REFEREE, MATCH_OFFICIAL,
 * REFEREE_OBSERVER. PLATFORM_SUPERADMIN volontairement absent de ce flux
 * self-service.
 *
 * Autorisation par rôle (migration.md §9) :
 * - FEDERATION_ADMIN : réservé à PLATFORM_SUPERADMIN (créer un
 *   administrateur fédéral est une action de niveau plateforme) ;
 * - LEAGUE_ADMIN : PLATFORM_SUPERADMIN ou le FEDERATION_ADMIN de la
 *   fédération RÉELLE de la ligue ciblée (résolue serveur, jamais un
 *   federationId fourni par le client — §3) ;
 * - REFEREE/MATCH_OFFICIAL/REFEREE_OBSERVER : PLATFORM_SUPERADMIN ou tout
 *   FEDERATION_ADMIN (gestion du corps arbitral, §9 "gérer les arbitres" —
 *   ces comptes n'ont pas de scope fédéral propre, voir Phase 4/5).
 */
const SUPPORTED_ROLES = new Set(['FEDERATION_ADMIN', 'LEAGUE_ADMIN', 'REFEREE', 'MATCH_OFFICIAL', 'REFEREE_OBSERVER'])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const role = body.role

    if (!name || !email || !SUPPORTED_ROLES.has(role)) {
      return NextResponse.json(
        { error: 'name, email et role (FEDERATION_ADMIN, LEAGUE_ADMIN, REFEREE, MATCH_OFFICIAL ou REFEREE_OBSERVER) sont requis' },
        { status: 400 },
      )
    }

    const session = await getAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const input: CreateInvitationInput = { name, email, role }

    if (role === 'FEDERATION_ADMIN') {
      if (!canAccessPlatform(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      input.federationId = body.federation_id
    } else if (role === 'LEAGUE_ADMIN') {
      const leagueId = body.league_id
      if (!leagueId) {
        return NextResponse.json({ error: 'league_id est requis pour LEAGUE_ADMIN' }, { status: 400 })
      }
      const dataSource = await getDataSource()
      const league = await dataSource.getRepository(League).findOne({ where: { id: leagueId } })
      if (!league) {
        return NextResponse.json({ error: 'Ligue introuvable' }, { status: 404 })
      }
      if (!canAccessFederation(session, league.federation_id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      input.leagueId = leagueId
    } else {
      // REFEREE / MATCH_OFFICIAL / REFEREE_OBSERVER
      if (!canAccessPlatform(session) && session.role !== 'FEDERATION_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
    const proto = request.headers.get('x-forwarded-proto') ?? 'https'
    const appUrl = `${proto}://${host}`

    const invitation = await createInvitation(input, appUrl)
    await logAdminAction({
      request,
      action: 'create',
      entityType: 'staff_invitation',
      entityId: invitation.id,
      summary: `${email} (${role})`,
    })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error creating staff invitation:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}
