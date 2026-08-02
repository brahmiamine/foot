import { NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { fetchMatchesByJourneeWithUserVote } from '@/lib/dataAccess'
import { enforcePublicRateLimit } from '@/lib/publicRateLimit'

/**
 * Endpoint pour récupérer les matches d'une journée avec les votes de l'utilisateur
 * GET /api/journees/[id]/matches?fingerprint=xxx
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = enforcePublicRateLimit(request, 'journees-matches')
  if (limited) return limited

  try {
    const { id: journeeId } = await params
    const { searchParams } = new URL(request.url)
    const fingerprint = searchParams.get('fingerprint')

    if (!journeeId) {
      return NextResponse.json(
        { error: 'Journee ID is required' },
        { status: 400 }
      )
    }

    // Récupérer les matches avec les votes utilisateur (si fingerprint fourni)
    const matches = await fetchMatchesByJourneeWithUserVote(
      journeeId,
      fingerprint || null
    )

    return NextResponse.json(matches)
  } catch (error) {
    console.error('Error fetching matches with user votes:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: safeErrorMessage(error) 
      },
      { status: 500 }
    )
  }
}

