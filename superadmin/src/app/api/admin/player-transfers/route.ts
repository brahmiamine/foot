import { NextRequest, NextResponse } from 'next/server'
import { In } from 'typeorm'
import { safeErrorMessage } from '@/lib/apiError'
import { getAdminSession, canAccessFederation, canAccessPlatform } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { Player, Team, TeamAffiliation } from '@/lib/entities'
import { getActiveAffiliation } from '@/lib/teamAffiliations'
import { createPlayerTransfer, completePlayerTransfer, listPlayerTransfers, PlayerTransferClientError } from '@/lib/playerTransferClient'
import { toPlain } from '@/lib/serialization'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

const VALID_STATUSES = new Set(['DRAFT', 'PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED', 'REJECTED'])

/**
 * GET /api/admin/player-transfers — tableau de bord Transferts
 * (migration.md §23). `teamManager` ne connaît pas les fédérations
 * (`team_affiliations` vit ici) : pour un `FEDERATION_ADMIN`, on relit
 * d'abord les clubs jamais/actuellement affiliés à sa fédération, puis on
 * filtre la liste renvoyée par `teamManager` à celles impliquant un de ces
 * clubs (source OU destination) — jamais un `federationId` fourni par le
 * client. `PLATFORM_SUPERADMIN` voit tout, sans filtre.
 */
export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session || !(canAccessPlatform(session) || session.role === 'FEDERATION_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const status = statusParam && VALID_STATUSES.has(statusParam) ? statusParam : undefined

    const transfers = await listPlayerTransfers(status)
    const dataSource = await getDataSource()

    let scoped = transfers
    if (!canAccessPlatform(session) && session.federationId) {
      const affiliations = await dataSource
        .getRepository(TeamAffiliation)
        .find({ where: { federationId: session.federationId } })
      const federationTeamIds = new Set(affiliations.map((a) => a.teamId))
      scoped = transfers.filter((t) => federationTeamIds.has(t.fromTeamId) || federationTeamIds.has(t.toTeamId))
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
 * POST /api/admin/player-transfers — migration.md §19-21, Phase 3.
 * `superadmin` (fédération/ligue) pilote l'homologation mais n'écrit
 * jamais directement `Player`/`cms_team_members` : il appelle les routes
 * internes de `teamManager` (voir lib/playerTransferClient.ts), seul
 * endroit où `player_transfers`, `Player.teamId` et `cms_team_members`
 * peuvent être mis à jour dans une transaction DB unique.
 *
 * Version simplifiée v1 (migration.md §19 l'autorise explicitement tant
 * que seuls les administrateurs fédéraux créent les transferts) : create +
 * complete enchaînés dans le même appel plutôt qu'un workflow de
 * validation à deux acteurs (club source/destination) — pas de PATCH
 * d'approbation séparé pour l'instant.
 *
 * Autorisation : dérivée de la fédération qui gouverne ACTUELLEMENT le
 * club source (`team_affiliations`, Phase 2), jamais d'un federation_id
 * fourni par le client — un club sans affiliation active ne peut être
 * transféré que par PLATFORM_SUPERADMIN.
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

    if (!player_id || !from_team_id || !to_team_id || !transfer_type || !effective_date) {
      return NextResponse.json(
        { error: 'player_id, from_team_id, to_team_id, transfer_type et effective_date sont requis' },
        { status: 400 },
      )
    }

    const session = await getAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dataSource = await getDataSource()
    const sourceAffiliation = await getActiveAffiliation(dataSource, from_team_id)

    if (!sourceAffiliation) {
      if (!canAccessPlatform(session)) {
        return NextResponse.json(
          { error: "Club source sans fédération active connue — action réservée à PLATFORM_SUPERADMIN" },
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
      seasonId: season_id ?? null,
      fee: fee ?? null,
      currency: currency ?? null,
      loanStartDate: loan_start_date ?? null,
      loanEndDate: loan_end_date ?? null,
      notes: notes ?? null,
      createdBy: session.email,
    })

    try {
      const completed = await completePlayerTransfer(created.id, session.email)
      await logAdminAction({
        request,
        action: 'create',
        entityType: 'player_transfer',
        entityId: completed.id,
        summary: `Joueur ${player_id} transféré de ${from_team_id} vers ${to_team_id} (${transfer_type})`,
      })
      return NextResponse.json(completed, { status: 201 })
    } catch (completeError) {
      // Le dossier existe côté teamManager (statut PENDING) même si son
      // homologation immédiate a échoué — jamais silencieusement perdu,
      // rejouable via POST /api/internal/player-transfers/:id/complete.
      await logAdminAction({
        request,
        action: 'create',
        entityType: 'player_transfer',
        entityId: created.id,
        summary: `Transfert créé (PENDING) mais homologation immédiate échouée : ${safeErrorMessage(completeError)}`,
      })
      return NextResponse.json(
        { ...created, warning: `Transfert créé mais non homologué automatiquement : ${safeErrorMessage(completeError)}` },
        { status: 202 },
      )
    }
  } catch (error) {
    if (error instanceof PlayerTransferClientError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error creating player transfer:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}
