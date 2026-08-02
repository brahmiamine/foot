import { NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getDataSource } from '@/lib/db'
import { Vote } from '@/lib/entities'
import { hasFingerprintProof } from '@/lib/fingerprintProof'

/**
 * Retourne uniquement les IDs des matchs sur lesquels l'utilisateur a voté
 * Utilise une jointure optimisée pour récupérer uniquement les match_ids
 */
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

    // Protection IDOR : sans preuve cookie, on répond comme si aucun match n'avait
    // été voté par cette empreinte (comportement identique à un nouveau visiteur).
    if (!hasFingerprintProof(request, fingerprint)) {
      return NextResponse.json({ matchIds: [] })
    }

    const dataSource = await getDataSource()
    const voteRepo = dataSource.getRepository<Vote>('votes')
    
    // Récupérer uniquement les match_ids distincts avec une requête optimisée
    const votes = await voteRepo
      .createQueryBuilder('vote')
      .select('DISTINCT vote.match_id', 'match_id')
      .where('vote.device_fingerprint = :fingerprint', { fingerprint })
      .andWhere('vote.moderation_status IN (:...statuses)', { 
        statuses: ['pending', 'validated'] 
      })
      .getRawMany()

    // Extraire les match_ids
    const matchIds = votes.map((v: any) => v.match_id).filter(Boolean)

    return NextResponse.json({ matchIds })
  } catch (error) {
    console.error('Error fetching voted matches:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: safeErrorMessage(error) },
      { status: 500 }
    )
  }
}

