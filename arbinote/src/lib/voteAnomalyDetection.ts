/**
 * Détection d'anomalies statistiques dans les votes
 * Identifie les patterns suspects de manipulation (brigading)
 */

export interface VoteData {
  note_globale: number
  created_at: Date | string
  device_fingerprint?: string | null
  ip_address?: string | null
}

export interface VoteAnomalyResult {
  isSuspicious: boolean
  confidence: number // 0-1, 1 = très suspect
  reasons: string[]
  details: {
    extremeVotesPercentage?: number
    timeGroupingDetected?: boolean
    variance?: number
    earlyVotesPercentage?: number
  }
}

/**
 * Détecte les anomalies statistiques dans un ensemble de votes
 * 
 * @param votes - Tableau de votes à analyser
 * @param matchDate - Date de début du match (pour détecter les votes trop rapides)
 * @returns Résultat de l'analyse avec score de suspicion
 */
export function detectVoteAnomalies(
  votes: VoteData[],
  matchDate?: Date | string | null
): VoteAnomalyResult {
  const reasons: string[] = []
  let suspiciousScore = 0
  const details: VoteAnomalyResult['details'] = {}

  // Si pas de votes, pas d'anomalie
  if (votes.length === 0) {
    return {
      isSuspicious: false,
      confidence: 0,
      reasons: [],
      details: {},
    }
  }

  // Si moins de 5 votes, on ne peut pas vraiment détecter d'anomalies statistiques
  if (votes.length < 5) {
    return {
      isSuspicious: false,
      confidence: 0,
      reasons: ['Pas assez de votes pour une analyse statistique fiable'],
      details: {},
    }
  }

  // 1. Détection de votes extrêmes groupés (>80% à 5/5 ou <20% à 1/5)
  const extremeVotes = votes.filter((v) => {
    const note = typeof v.note_globale === 'string' 
      ? parseFloat(v.note_globale) 
      : v.note_globale
    return note >= 4.8 || note <= 1.2
  })
  const extremePercentage = (extremeVotes.length / votes.length) * 100
  details.extremeVotesPercentage = extremePercentage

  if (extremePercentage > 80) {
    suspiciousScore += 0.4
    reasons.push(
      `Trop de votes extrêmes (${extremePercentage.toFixed(1)}% à 5/5 ou 1/5) - Possible manipulation coordonnée`
    )
  } else if (extremePercentage > 60) {
    suspiciousScore += 0.2
    reasons.push(
      `Beaucoup de votes extrêmes (${extremePercentage.toFixed(1)}%) - À surveiller`
    )
  }

  // 2. Détection de votes groupés dans le temps (brigading coordonné)
  // Vérifier si >50% des votes arrivent dans une fenêtre de 10 minutes
  const sortedVotes = [...votes].sort((a, b) => {
    const dateA = typeof a.created_at === 'string' ? new Date(a.created_at) : a.created_at
    const dateB = typeof b.created_at === 'string' ? new Date(b.created_at) : b.created_at
    return dateA.getTime() - dateB.getTime()
  })

      let timeGroupingDetected = false
      for (let i = 0; i < sortedVotes.length; i++) {
        const windowStart = typeof sortedVotes[i].created_at === 'string'
          ? new Date(sortedVotes[i].created_at)
          : sortedVotes[i].created_at
        const windowStartDate = windowStart instanceof Date ? windowStart : new Date(windowStart)
        const windowEnd = new Date(windowStartDate.getTime() + 10 * 60 * 1000) // 10 minutes

        const votesInWindow = sortedVotes.filter((v) => {
          const voteTime = typeof v.created_at === 'string' ? new Date(v.created_at) : v.created_at
          const voteTimeDate = voteTime instanceof Date ? voteTime : new Date(voteTime)
          return voteTimeDate >= windowStartDate && voteTimeDate <= windowEnd
        }).length

    if (votesInWindow / votes.length > 0.5 && votesInWindow >= 5) {
      timeGroupingDetected = true
      suspiciousScore += 0.3
      reasons.push(
        `Votes groupés dans le temps (${votesInWindow} votes en 10 minutes) - Possible brigading coordonné`
      )
      break
    }
  }
  details.timeGroupingDetected = timeGroupingDetected

  // 3. Détection de variance trop faible (tous les votes similaires)
  const notes = votes.map((v) => {
    return typeof v.note_globale === 'string' 
      ? parseFloat(v.note_globale) 
      : v.note_globale
  }).filter((n) => !isNaN(n) && n > 0)

  if (notes.length > 0) {
    const mean = notes.reduce((sum, note) => sum + note, 0) / notes.length
    const variance = notes.reduce((sum, note) => sum + Math.pow(note - mean, 2), 0) / notes.length
    const stdDev = Math.sqrt(variance)
    details.variance = stdDev

    // Si variance très faible (< 0.3) avec assez de votes, c'est suspect
    if (stdDev < 0.3 && votes.length >= 10) {
      suspiciousScore += 0.3
      reasons.push(
        `Variance trop faible (écart-type: ${stdDev.toFixed(2)}) - Tous les votes sont très similaires, possible coordination`
      )
    } else if (stdDev < 0.5 && votes.length >= 15) {
      suspiciousScore += 0.15
      reasons.push(
        `Variance faible (écart-type: ${stdDev.toFixed(2)}) - Votes très similaires`
      )
    }
  }

  // 4. Détection de votes trop rapides après l'ouverture (possiblement non réfléchis ou coordonnés)
  if (matchDate) {
    const matchStartTime = typeof matchDate === 'string' ? new Date(matchDate) : matchDate
    const earlyVotes = votes.filter((v) => {
      const voteTime = typeof v.created_at === 'string' ? new Date(v.created_at) : v.created_at
      const minutesAfterStart = (voteTime.getTime() - matchStartTime.getTime()) / (1000 * 60)
      // Votes entre 30 et 35 minutes après le début (juste après l'ouverture)
      return minutesAfterStart >= 30 && minutesAfterStart <= 35
    })

    const earlyPercentage = (earlyVotes.length / votes.length) * 100
    details.earlyVotesPercentage = earlyPercentage

    if (earlyPercentage > 60 && votes.length >= 10) {
      suspiciousScore += 0.2
      reasons.push(
        `Trop de votes immédiatement après l'ouverture (${earlyPercentage.toFixed(1)}% dans les 5 premières minutes) - Possiblement non réfléchis ou coordonnés`
      )
    }
  }

  // Normaliser le score de suspicion entre 0 et 1
  const confidence = Math.min(suspiciousScore, 1)

  return {
    isSuspicious: confidence >= 0.5, // Seuil à 50% de suspicion
    confidence,
    reasons,
    details,
  }
}

/**
 * Analyse les votes d'un match et retourne un score de crédibilité
 * 
 * @param votes - Tableau de votes du match
 * @param matchDate - Date de début du match
 * @returns Score de crédibilité (0-100, 100 = très fiable)
 */
export function calculateVoteCredibility(
  votes: VoteData[],
  matchDate?: Date | string | null
): number {
  const anomaly = detectVoteAnomalies(votes, matchDate)
  // Convertir le score de suspicion en score de crédibilité
  // 0% suspicion = 100% crédibilité, 100% suspicion = 0% crédibilité
  return Math.max(0, 100 - (anomaly.confidence * 100))
}

