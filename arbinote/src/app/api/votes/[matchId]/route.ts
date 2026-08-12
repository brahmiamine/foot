import { NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getDataSource } from '@/lib/db'
import { Vote } from '@/lib/entities'
import { toPlainArray } from '@/lib/serialization'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params

    console.log('Fetching votes for match:', matchId)

    const dataSource = await getDataSource()
    const voteRepo = dataSource.getRepository<Vote>('votes')
    const votes = await voteRepo.find({
      where: { match_id: matchId },
      order: { created_at: 'DESC' },
    })

    console.log('Votes found:', votes.length)

    // Serialize votes properly
    const votesData = toPlainArray(votes).map((vote) => ({
      ...vote,
      note_globale: typeof vote.note_globale === 'string' 
        ? parseFloat(vote.note_globale) 
        : vote.note_globale,
    }))

    return NextResponse.json(votesData)
  } catch (error) {
    console.error('Unexpected error in /api/votes/[matchId]:', error)
    console.error('Error details:', safeErrorMessage(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json(
      { error: 'Internal server error', details: safeErrorMessage(error) },
      { status: 500 }
    )
  }
}

