import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getAdminSession, canAccessFederation, canAccessPlatform } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { getActiveAffiliation } from '@/lib/teamAffiliations'
import { createPlayerTransfer, completePlayerTransfer, PlayerTransferClientError } from '@/lib/playerTransferClient'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

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
