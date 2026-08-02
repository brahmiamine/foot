import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getActiveLeagueId } from '@/lib/leagueSelection'
import { fetchCurrentJournee } from '@/lib/currentJournee'
import { fetchMatchesByJournee, fetchVotesByMatchIds, fetchCritereDefinitions } from '@/lib/dataAccess'
import { buildBayesianRanking } from '@/lib/bayesianRanking'
import { buildCsv, csvResponseHeaders } from '@/lib/csv'
import { enforcePublicRateLimit } from '@/lib/publicRateLimit'
import type { CritereDefinition, Vote } from '@/types'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // Génération plus coûteuse qu'une simple lecture : limite plus stricte.
  const limited = enforcePublicRateLimit(request, 'classement-export', { max: 10 })
  if (limited) return limited

  try {
    const leagueId = await getActiveLeagueId()
    const { searchParams } = new URL(request.url)
    let journeeId = searchParams.get('journeeId') || undefined

    if (!journeeId) {
      const currentJournee = await fetchCurrentJournee(leagueId ?? undefined, new Date())
      journeeId = currentJournee?.id
    }

    if (!journeeId) {
      return NextResponse.json({ error: 'Aucune journée disponible pour cet export' }, { status: 404 })
    }

    const matches = await fetchMatchesByJournee(journeeId)
    const matchIds = matches.map((m: any) => m.id)
    const votes = (await fetchVotesByMatchIds(matchIds)) as Vote[]
    const criteresDefinitions = (await fetchCritereDefinitions()) as unknown as CritereDefinition[]
    const arbitreCriteres = criteresDefinitions.filter((c) => c.categorie === 'arbitre')

    const ranking = buildBayesianRanking(votes, {
      criteres: arbitreCriteres,
      includeCategories: ['arbitre'],
    })

    const headers = ['Rang', 'Arbitre', 'Moyenne brute', 'Score bayésien', 'Nombre de votes']
    const rows = ranking.map((entry, index) => [
      index + 1,
      entry.nom,
      entry.moyenne,
      entry.moyenne_bayesienne,
      entry.votes,
    ])

    const csv = buildCsv(headers, rows)
    const filename = `classement-arbinote-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, { headers: csvResponseHeaders(filename) })
  } catch (error) {
    console.error('Error exporting classement CSV:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 500 }
    )
  }
}
