import { NextRequest, NextResponse } from 'next/server'
import { ensureServiceAuth } from '@/lib/serviceAuth'
import { MatchLineupService } from '@/services/MatchLineupService'
import type { ClubMatchLineupEntry } from '../../../../../../../packages/domain-contracts/src/club-lineup'

function toContract(row: Awaited<ReturnType<MatchLineupService['findAllForMatch']>>[number]): ClubMatchLineupEntry {
  return {
    id: row.id,
    matchId: row.matchId ?? '',
    teamId: row.teamId,
    playerId: row.playerId,
    role: row.role,
    shirtNumber: row.shirtNumber ?? null,
    position: row.position ?? null,
    isCaptain: Boolean(row.isCaptain),
    player: row.player
      ? {
          id: row.player.id,
          firstNameFr: row.player.firstNameFr,
          lastNameFr: row.player.lastNameFr,
          firstNameAr: row.player.firstNameAr ?? null,
          lastNameAr: row.player.lastNameAr ?? null,
        }
      : null,
    team: row.team
      ? {
          id: row.team.id,
          name: row.team.nom,
          nameAr: row.team.nomAr ?? null,
        }
      : null,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const authError = ensureServiceAuth(request)
  if (authError) return authError

  const { matchId } = await params
  if (!matchId) return NextResponse.json({ error: 'matchId is required' }, { status: 400 })

  const teamId = request.nextUrl.searchParams.get('teamId')?.trim() || null
  const service = new MatchLineupService()
  const rows = teamId
    ? await service.findByMatch(teamId, { matchType: 'OFFICIAL', matchId })
    : await service.findAllForMatch(matchId)

  return NextResponse.json({ lineup: rows.map(toContract) })
}
