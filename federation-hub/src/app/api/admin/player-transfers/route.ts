import { NextRequest, NextResponse } from 'next/server'
import { In } from 'typeorm'
import { safeErrorMessage } from '@/lib/apiError'
import { getAdminSession, canAccessFederation, canAccessPlatform } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { Player, Team, TeamAffiliation } from '@/lib/entities'
import { getActiveAffiliation } from '@/lib/teamAffiliations'
import { createPlayerTransfer, listPlayerTransfers, PlayerTransferClientError } from '@/lib/playerTransferClient'
import { toPlain } from '@/lib/serialization'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

const VALID_STATUSES = new Set(['DRAFT', 'PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED', 'REJECTED'])

/**
 * GET /api/admin/player-transfers — tableau de bord Transferts.
 *
 * PLATFORM_SUPERADMIN voit tout. FEDERATION_ADMIN et LEAGUE_ADMIN sont
 * filtrés à partir de `team_affiliations`, jamais à partir d'un identifiant
 * de périmètre fourni par le navigateur. Un compte scoped sans federationId
 * ou leagueId est fermé par défaut et ne voit aucun transfert.
 */
export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (
    !session ||
    !(canAccessPlatform(session) || session.role === 'FEDERATION_ADMIN' || session.role === 'LEAGUE_ADMIN')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const status = statusParam && VALID_STATUSES.has(statusParam) ? statusParam : undefined

    const transfers = await listPlayerTransfers(status)
    const dataSource = await getDataSource()

    let scoped = transfers
    if (!canAccessPlatform(session)) {
      const affiliationRepo = dataSource.getRepository(TeamAffiliation)
      let affiliations: TeamAffiliation[] = []

      if (session.role === 'FEDERATION_ADMIN' && session.federationId) {
        affiliations = await affiliationRepo.find({ where: { federationId: session.federationId } })
      } else if (session.role === 'LEAGUE_ADMIN' && session.leagueId) {
        affiliations = await affiliationRepo.find({ where: { leagueId: session.leagueId } })
      }

      const scopedTeamIds = new Set(affiliations.map((affiliation) => affiliation.teamId))
      scoped = transfers.filter(
        (transfer) => scopedTeamIds.has(transfer.fromTeamId) || scopedTeamIds.has(transfer.toTeamId),
      )
    }

    const teamIds = [...new Set(scoped.flatMap((t) => [t.fromTeamId, t.toTeamId]))]
    const playerIds = [...new Set(scoped.map((t) => t.playerId))]
    const [teams, players] = await Promise.all([
      teamIds.length ? dataSource.getRepository(Team).find({ where: { id: In(teamIds) } }) : Promise.resolve([]),
      playerIds.length ? dataSource.getRepository(Player).find({ where: { id: In(playerIds) } }) : Promise.resolve([]),
    ])
    const teamNames = new Map(teams.map((t) => [t.id, t.nom]))
    const playerNames = new Map(players.map((p) => [p.id, `${p.firstNameFr} ${p.lastNameFr}`.trim()]))

    return NextResponse.json(
      toPlain(
        scoped.map((t) => ({
          ...t,
          fromTeamName: teamNames.get(t.fromTeamId) ?? null,
          toTeamName: teamNames.get(t.toTeamId) ?? null,
          playerName: playerNames.get(t.playerId) ?? null,
        })),
      ),
    )
  } catch (error) {
    if (error instanceof PlayerTransferClientError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error listing player transfers:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 })
  }
}

/**
 * POST /api/admin/player-transfers — création administrative d'une demande.
 *
 * Le workflow réglementaire est strictement multi-acteurs :
 * PENDING (création) -> APPROVED (club destination) -> COMPLETED
 * (homologation fédérale via /[id]/homologate).
 *
 * Cette route ne tente jamais d'homologuer immédiatement une demande qu'elle
 * vient de créer. Elle reste une capacité administrative plateforme/fédération ;
 * les LEAGUE_ADMIN consultent et homologuent dans leur périmètre mais ne créent
 * pas de demande depuis ce back-office.
 *
 * Autorisation : dérivée de l'affiliation active du club source. Un club sans
 * affiliation active reste réservé à PLATFORM_SUPERADMIN.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      player_id,
      from_team_id,
      to_team_id,
      transfer_type,
      effective_date,
      season_id,
      fee,
      currency,
      loan_start_date,
      loan_end_date,
      notes,
    } = body

    if (!player_id || !from_team_id || !to_team_id || !transfer_type || !effective_date || !season_id) {
      return NextResponse.json(
        {
          error:
            'player_id, from_team_id, to_team_id, transfer_type, effective_date et season_id sont requis',
        },
        { status: 400 },
      )
    }

    const session = await getAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(canAccessPlatform(session) || session.role === 'FEDERATION_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const dataSource = await getDataSource()
    const sourceAffiliation = await getActiveAffiliation(dataSource, from_team_id)

    if (!sourceAffiliation) {
      if (!canAccessPlatform(session)) {
        return NextResponse.json(
          { error: 'Club source sans fédération active connue — action réservée à PLATFORM_SUPERADMIN' },
          { status: 403 },
        )
      }
    } else if (!canAccessFederation(session, sourceAffiliation.federationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const created = await createPlayerTransfer({
      playerId: player_id,
      fromTeamId: from_team_id,
      toTeamId: to_team_id,
      transferType: transfer_type,
      effectiveDate: effective_date,
      seasonId: season_id,
      fee: fee ?? null,
      currency: currency ?? null,
      loanStartDate: loan_start_date ?? null,
      loanEndDate: loan_end_date ?? null,
      notes: notes ?? null,
      createdBy: session.email,
    })

    await logAdminAction({
      request,
      action: 'create',
      entityType: 'player_transfer',
      entityId: created.id,
      summary: `Demande de transfert ${created.id} créée en attente d'approbation du club destination`,
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof PlayerTransferClientError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error creating player transfer:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}
