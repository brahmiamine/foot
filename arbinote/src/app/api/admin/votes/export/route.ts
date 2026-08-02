import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { safeErrorMessage } from '@/lib/apiError'
import { getActiveLeagueId } from '@/lib/leagueSelection'
import { listVotesForAdmin, VoteFilters } from '@/lib/adminVotes'
import { buildCsv, csvResponseHeaders } from '@/lib/csv'
import { getLocalizedName } from '@/lib/utils'

export const runtime = 'nodejs'

// Garde-fou : évite un export incontrôlé si la base grossit énormément.
const MAX_EXPORT_ROWS = 20000

export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const leagueId = await getActiveLeagueId()
    const { searchParams } = new URL(request.url)

    const voteStatusParam = searchParams.get('voteStatus')
    let voteStatus: VoteFilters['voteStatus'] = 'all'
    if (voteStatusParam === 'voted' || voteStatusParam === 'not_voted') {
      voteStatus = voteStatusParam
    }

    const filters: VoteFilters = {
      matchId: searchParams.get('matchId') || undefined,
      arbitreId: searchParams.get('arbitreId') || undefined,
      journeeId: searchParams.get('journeeId') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      voteStatus,
      limit: MAX_EXPORT_ROWS,
      offset: 0,
    }

    const { votes } = await listVotesForAdmin(filters, leagueId)

    const headers = [
      'Date',
      'Match',
      'Journée',
      'Arbitre',
      'Note globale',
      'Statut modération',
      'Empreinte appareil',
      'Adresse IP',
    ]

    const rows = votes.map((vote: any) => {
      const homeName = vote.match?.equipe_home ? getLocalizedName('fr', {
        defaultValue: vote.match.equipe_home.nom,
        fr: vote.match.equipe_home.nom,
      }) : ''
      const awayName = vote.match?.equipe_away ? getLocalizedName('fr', {
        defaultValue: vote.match.equipe_away.nom,
        fr: vote.match.equipe_away.nom,
      }) : ''
      const arbitreName = vote.arbitre?.nom ?? ''
      const journeeLabel = vote.match?.journee?.numero ?? vote.match?.journee?.nom_fr ?? ''

      return [
        vote.created_at ? new Date(vote.created_at).toISOString() : '',
        homeName && awayName ? `${homeName} - ${awayName}` : '',
        journeeLabel,
        arbitreName,
        vote.note_globale,
        vote.moderation_status ?? '',
        vote.device_fingerprint ?? '',
        vote.ip_address ?? '',
      ]
    })

    const csv = buildCsv(headers, rows)
    const filename = `votes-arbinote-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, { headers: csvResponseHeaders(filename) })
  } catch (error) {
    console.error('Error exporting votes CSV:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 500 }
    )
  }
}
