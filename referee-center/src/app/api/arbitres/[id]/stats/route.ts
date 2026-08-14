import { NextResponse } from 'next/server'
import { Criteres } from '@/types'
import { fetchArbitreById, fetchVotesByArbitre } from '@/lib/dataAccess'
import { enforcePublicRateLimit } from '@/lib/publicRateLimit'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = enforcePublicRateLimit(request, 'arbitre-stats')
  if (limited) return limited

  try {
    const { id: arbitreId } = await params

    // Récupérer l'arbitre
    const arbitre = await fetchArbitreById(arbitreId)

    if (!arbitre) {
      return NextResponse.json(
        { error: 'Arbitre not found' },
        { status: 404 }
      )
    }

    // Calculer les statistiques des votes (déjà filtrés par fetchVotesByArbitre)
    const votes = await fetchVotesByArbitre(arbitreId)

    const nombreVotes = votes?.length || 0
    const moyenneNote =
      nombreVotes > 0
        ? votes.reduce((sum, v) => sum + Number(v.note_globale), 0) / nombreVotes
        : 0

    // Statistiques par critère
    const statsCriteres = {
      fairplay: 0,
      decisions: 0,
      gestion: 0,
      communication: 0,
    }

    if (votes && votes.length > 0) {
      votes.forEach((vote) => {
        const criteres = vote.criteres as Criteres
        if (criteres) {
          statsCriteres.fairplay += criteres.fairplay || 0
          statsCriteres.decisions += criteres.decisions || 0
          statsCriteres.gestion += criteres.gestion || 0
          statsCriteres.communication += criteres.communication || 0
        }
      })

      Object.keys(statsCriteres).forEach((key) => {
        statsCriteres[key as keyof typeof statsCriteres] /= nombreVotes
      })
    }

    return NextResponse.json({
      arbitre,
      stats: {
        nombre_votes: nombreVotes,
        moyenne_note: Math.round(moyenneNote * 100) / 100,
        moyenne_criteres: statsCriteres,
      },
      votes: votes || [],
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

