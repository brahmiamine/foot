import { NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getDataSource } from '@/lib/db'
import { Vote } from '@/lib/entities'
import { toPlain } from '@/lib/serialization'
import { hasFingerprintProof } from '@/lib/fingerprintProof'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params
    
    const { searchParams } = new URL(request.url)
    const deviceFingerprint = searchParams.get('fingerprint')

    if (!deviceFingerprint) {
      return NextResponse.json(
        { error: 'Device fingerprint is required' },
        { status: 400 }
      )
    }

    // Protection IDOR : seul le navigateur ayant réellement voté avec cette
    // empreinte possède le cookie de preuve correspondant. Sans lui, on répond
    // comme si aucun vote n'existait plutôt que de renvoyer une erreur explicite.
    if (!hasFingerprintProof(request, deviceFingerprint)) {
      return NextResponse.json(null, { status: 404 })
    }

    console.log('Fetching vote for match:', matchId, 'fingerprint:', deviceFingerprint)

    const dataSource = await getDataSource()
    const voteRepo = dataSource.getRepository<Vote>('votes')
    const vote = await voteRepo.findOne({
      where: { 
        match_id: matchId,
        device_fingerprint: deviceFingerprint
      },
      order: { created_at: 'DESC' },
    })

    console.log('Vote found:', !!vote)

    if (!vote) {
      return NextResponse.json(null, { status: 404 })
    }

    // Serialize the vote properly using the existing serialization utility
    const voteData = toPlain(vote)
    
    // Ensure note_globale is a number
    if (voteData.note_globale && typeof voteData.note_globale === 'string') {
      voteData.note_globale = parseFloat(voteData.note_globale)
    }

    return NextResponse.json(voteData)
  } catch (error) {
    console.error('Unexpected error in /api/votes/[matchId]/user:', error)
    console.error('Error details:', safeErrorMessage(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json(
      { error: 'Internal server error', details: safeErrorMessage(error) },
      { status: 500 }
    )
  }
}

