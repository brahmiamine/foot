import { NextResponse } from 'next/server'
import { getDataSource } from '@/lib/db'
import { Match, Vote as VoteEntity } from '@/lib/entities'
import { canVoteMatch, getClientIP, roundNote } from '@/lib/utils'
import { detectVoteAnomalies } from '@/lib/voteAnomalyDetection'
import { issueFingerprintProofCookie } from '@/lib/fingerprintProof'
import { MoreThan } from 'typeorm'

const CRITERE_MIN = 1
const CRITERE_MAX = 5

// Recalcule note_globale côté serveur à partir des critères plutôt que de faire confiance
// à la valeur envoyée par le client : sinon un appel API direct (hors formulaire) pourrait
// soumettre n'importe quelle note_globale sans rapport avec les critères notés, ce qui
// fausserait la moyenne de l'arbitre, le classement bayésien et la détection d'anomalies.
function computeServerNoteGlobale(criteres: unknown): number | null {
  if (!criteres || typeof criteres !== 'object' || Array.isArray(criteres)) {
    return null
  }

  const values = Object.values(criteres as Record<string, unknown>).map((v) => Number(v))

  if (values.length === 0 || values.some((v) => !Number.isFinite(v) || v < CRITERE_MIN || v > CRITERE_MAX)) {
    return null
  }

  const sum = values.reduce((acc, v) => acc + v, 0)
  return roundNote(sum / values.length)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { match_id, arbitre_id, criteres, device_fingerprint } = body

    // Validation
    if (!match_id || !arbitre_id || !criteres || !device_fingerprint) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const note_globale = computeServerNoteGlobale(criteres)
    if (note_globale === null) {
      return NextResponse.json(
        { error: `Invalid criteres: each value must be a number between ${CRITERE_MIN} and ${CRITERE_MAX}` },
        { status: 400 }
      )
    }

    // Extraire l'adresse IP du client de manière sécurisée
    const clientIP = getClientIP(request)

    const dataSource = await getDataSource()
    const matchRepo = dataSource.getRepository<Match>('matches')
    const voteRepo = dataSource.getRepository<VoteEntity>('votes')

    // Vérifier que le match existe
    const match = await matchRepo.findOne({
      select: ['id', 'arbitre_id', 'date', 'status', 'actual_started_at'],
      where: { id: match_id },
    })

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    // Vérifier que l'arbitre correspond
    if (match.arbitre_id !== arbitre_id) {
      return NextResponse.json(
        { error: 'Arbitre does not match the match' },
        { status: 400 }
      )
    }

    // Vérifier que le match peut être voté (arbitre attribué, statut réel IN_PROGRESS/FINISHED et au moins 30 min écoulées depuis actual_started_at)
    if (
      !canVoteMatch({
        arbitre_id: match.arbitre_id,
        status: match.status,
        actual_started_at: match.actual_started_at,
      })
    ) {
      return NextResponse.json(
        { error: 'Cannot vote: match has no referee assigned, match has not actually started yet (or was cancelled), or less than 30 minutes have elapsed since the match started' },
        { status: 400 }
      )
    }

    // Rate limiting intelligent : combinaison fingerprint + IP
    if (clientIP !== 'unknown') {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

      // 1. Vérifier les votes de ce fingerprint depuis cette IP (détection de multi-votes)
      // Limite : 5 votes maximum par fingerprint+IP par jour
      // Permet à une personne de voter pour plusieurs matchs, mais pas abusivement
      const votesFromSameFingerprintAndIP = await voteRepo.count({
        where: {
          ip_address: clientIP,
          device_fingerprint: device_fingerprint,
          created_at: MoreThan(oneDayAgo),
        },
      })

      if (votesFromSameFingerprintAndIP >= 5) {
        return NextResponse.json(
          { error: 'Trop de votes depuis cet appareil. Limite: 5 votes par jour.' },
          { status: 429 }
        )
      }

      // 2. Vérifier le nombre de fingerprints UNIQUES depuis cette IP (détection de brigading)
      // Limite : 15 fingerprints uniques par IP par jour
      // Permet plusieurs personnes sur le même WiFi de voter, mais détecte le brigading coordonné
      const uniqueFingerprintsFromIP = await voteRepo
        .createQueryBuilder('vote')
        .select('COUNT(DISTINCT vote.device_fingerprint)', 'count')
        .where('vote.ip_address = :ip', { ip: clientIP })
        .andWhere('vote.created_at > :oneDayAgo', { oneDayAgo: oneDayAgo })
        .getRawOne()

      const uniqueFingerprintCount = parseInt(uniqueFingerprintsFromIP?.count || '0', 10)

      if (uniqueFingerprintCount >= 15) {
        return NextResponse.json(
          { error: 'Trop de votes depuis cette adresse réseau. Limite: 15 votes par jour.' },
          { status: 429 }
        )
      }

      // 3. Détection de pattern suspect : même IP, beaucoup de votes en peu de temps
      // Si > 10 votes dans la dernière heure depuis la même IP = très suspect (brigading coordonné)
      const votesFromIPLastHour = await voteRepo.count({
        where: {
          ip_address: clientIP,
          created_at: MoreThan(oneHourAgo),
        },
      })

      if (votesFromIPLastHour >= 10) {
        return NextResponse.json(
          { error: 'Activité suspecte détectée depuis cette adresse réseau. Trop de votes en peu de temps.' },
          { status: 429 }
        )
      }
    }

    // Vérifier si l'utilisateur a déjà voté pour ce match (par fingerprint)
    const existingVote = await voteRepo.findOne({
      where: {
        match_id,
        device_fingerprint,
      },
    })

    if (existingVote) {
      return NextResponse.json(
        { error: 'Vous avez déjà voté pour ce match' },
        { status: 409 }
      )
    }

    // Insérer le vote avec l'adresse IP
    const vote = voteRepo.create({
      match_id,
      arbitre_id,
      criteres,
      note_globale,
      device_fingerprint,
      ip_address: clientIP !== 'unknown' ? clientIP : null,
    })

    // La vérification existingVote ci-dessus est vulnérable à une race condition
    // (deux requêtes concurrentes peuvent toutes deux la passer avant que l'une d'elles
    // n'insère). La contrainte UNIQUE (match_id, device_fingerprint) en base est le
    // garde-fou réel ; on transforme ici son échec en réponse 409 propre.
    let saved: VoteEntity
    try {
      saved = await voteRepo.save(vote)
    } catch (error) {
      const mysqlErrorCode = (err: unknown): string | undefined => {
        if (typeof err !== 'object' || err === null) return undefined
        const record = err as Record<string, unknown>
        if (typeof record.code === 'string') return record.code
        if (typeof record.driverError === 'object' && record.driverError !== null) {
          const driverCode = (record.driverError as Record<string, unknown>).code
          if (typeof driverCode === 'string') return driverCode
        }
        return undefined
      }
      const isDuplicate = mysqlErrorCode(error) === 'ER_DUP_ENTRY'
      if (isDuplicate) {
        return NextResponse.json(
          { error: 'Vous avez déjà voté pour ce match' },
          { status: 409 }
        )
      }
      throw error
    }

    // Détection d'anomalies statistiques (après enregistrement pour analyser tous les votes)
    // Récupérer tous les votes du match pour analyse
    const allMatchVotes = await voteRepo.find({
      where: { match_id },
      select: ['note_globale', 'created_at', 'device_fingerprint', 'ip_address'],
      order: { created_at: 'ASC' },
    })

    // Analyser les anomalies si on a assez de votes (minimum 5)
    if (allMatchVotes.length >= 5) {
      const votesForAnalysis = allMatchVotes.map((v) => ({
        note_globale: typeof v.note_globale === 'string' 
          ? parseFloat(v.note_globale) 
          : Number(v.note_globale),
        created_at: v.created_at || new Date(),
        device_fingerprint: v.device_fingerprint || null,
        ip_address: v.ip_address || null,
      }))

      const anomaly = detectVoteAnomalies(votesForAnalysis, match.date)

      // Logger les anomalies détectées pour analyse
      if (anomaly.isSuspicious) {
        console.warn('⚠️ Anomalies détectées dans les votes du match:', {
          match_id,
          confidence: anomaly.confidence,
          reasons: anomaly.reasons,
          details: anomaly.details,
          totalVotes: allMatchVotes.length,
        })
      }

      // Créer ou mettre à jour une alerte si seuil dépassé
      try {
        const { createOrUpdateVoteAlert } = await import('@/lib/voteAlerting')
        const alert = await createOrUpdateVoteAlert(match_id)
        if (alert) {
          console.log(`🔔 Alerte ${alert.alert_type} créée/mise à jour pour le match ${match_id} (confiance: ${(alert.confidence * 100).toFixed(0)}%)`)
        }
      } catch (alertError) {
        // Ne pas bloquer le vote en cas d'erreur d'alerte
        console.error('Erreur lors de la création de l\'alerte:', alertError)
      }
    }

    const response = NextResponse.json(saved, { status: 201 })
    issueFingerprintProofCookie(response, device_fingerprint)
    return response
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

