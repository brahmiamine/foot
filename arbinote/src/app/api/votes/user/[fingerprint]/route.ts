import { NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getDataSource } from '@/lib/db'
import { Vote } from '@/lib/entities'
import { toPlainArray } from '@/lib/serialization'
import { hasFingerprintProof } from '@/lib/fingerprintProof'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fingerprint: string }> }
) {
  try {
    const { fingerprint } = await params

    if (!fingerprint) {
      return NextResponse.json(
        { error: 'Device fingerprint is required' },
        { status: 400 }
      )
    }

    // Protection IDOR : sans la preuve cookie liée à cette empreinte, on renvoie
    // un historique vide plutôt que les votes d'un autre visiteur.
    if (!hasFingerprintProof(request, fingerprint)) {
      return NextResponse.json([])
    }

    const dataSource = await getDataSource()
    const voteRepo = dataSource.getRepository<Vote>('votes')
    const votes = await voteRepo.find({
      where: { device_fingerprint: fingerprint },
      relations: ['match', 'match.journee', 'match.journee.saison', 'match.journee.saison.league', 'match.equipe_home', 'match.equipe_away', 'match.arbitre'],
      order: { created_at: 'DESC' },
    })

    // Serialize votes properly
    const votesData = toPlainArray(votes).map((vote: any) => ({
      ...vote,
      note_globale: typeof vote.note_globale === 'string' 
        ? parseFloat(vote.note_globale) 
        : vote.note_globale,
    }))

    return NextResponse.json(votesData)
  } catch (error) {
    console.error('Unexpected error in /api/votes/user/[fingerprint]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: safeErrorMessage(error) },
      { status: 500 }
    )
  }
}

