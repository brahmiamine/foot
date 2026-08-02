/**
 * Système de pondération des votes
 * Attribue un poids (0-1) à chaque vote selon sa crédibilité
 * Réduit l'influence des votes suspects sans les exclure totalement
 */

import { detectVoteAnomalies, VoteAnomalyResult } from './voteAnomalyDetection'

export interface VoteWithWeight {
  vote: {
    id: string
    note_globale: number
    match_id?: string
    created_at?: Date | string
    device_fingerprint?: string | null
    ip_address?: string | null
  }
  weight: number // 0-1, 1 = poids normal, <1 = poids réduit
  reason?: string // Raison du poids réduit (pour debug/admin)
}

/**
 * Calcule le poids d'un vote individuel selon sa crédibilité
 * 
 * @param vote - Le vote à analyser
 * @param allVotes - Tous les votes du match (pour contexte)
 * @param matchDate - Date du match (pour détection d'anomalies)
 * @returns Poids du vote (0-1)
 */
export function calculateVoteWeight(
  vote: {
    note_globale: number
    match_id?: string
    created_at?: Date | string
    device_fingerprint?: string | null
    ip_address?: string | null
  },
  allVotes: Array<{
    note_globale: number
    created_at?: Date | string
    device_fingerprint?: string | null
    ip_address?: string | null
  }>,
  matchDate?: Date | string | null,
  // La détection d'anomalies ne dépend que du match (allVotes + matchDate), pas du vote
  // individuel : elle est donc identique pour tous les votes d'un même match. Un appelant
  // qui calcule le poids de plusieurs votes du même match peut la calculer une seule fois
  // et la passer ici pour éviter de la recalculer (coûteux : tri + parcours) à chaque vote.
  precomputedAnomaly?: VoteAnomalyResult
): { weight: number; reason?: string } {
  // Poids de base : 1.0 (vote normal)
  let weight = 1.0
  const reasons: string[] = []

  // Si pas assez de votes pour analyser, poids normal
  if (allVotes.length < 5) {
    return { weight: 1.0 }
  }

  const note = typeof vote.note_globale === 'string' 
    ? parseFloat(vote.note_globale) 
    : Number(vote.note_globale)

  // 1. Vote extrême isolé (très éloigné de la moyenne)
  const notes = allVotes.map(v => {
    return typeof v.note_globale === 'string' 
      ? parseFloat(v.note_globale) 
      : Number(v.note_globale)
  }).filter(n => !isNaN(n) && n > 0)

  if (notes.length > 0) {
    const mean = notes.reduce((sum, n) => sum + n, 0) / notes.length
    const stdDev = Math.sqrt(
      notes.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / notes.length
    )

    // Si le vote est > 2 écarts-types de la moyenne, poids réduit
    const deviation = Math.abs(note - mean)
    if (stdDev > 0 && deviation > 2 * stdDev) {
      // Plus l'écart est grand, plus le poids est réduit
      const reductionFactor = Math.min(0.5, deviation / (3 * stdDev))
      weight *= (1 - reductionFactor)
      reasons.push(`Vote extrême isolé (écart: ${deviation.toFixed(2)} de la moyenne)`)
    }
  }

  // 2. Vote dans un pattern suspect (détecté par analyse d'anomalies)
  const anomaly = precomputedAnomaly ?? detectVoteAnomalies(
    allVotes.map(v => ({
      note_globale: typeof v.note_globale === 'string'
        ? parseFloat(v.note_globale)
        : Number(v.note_globale),
      created_at: v.created_at || new Date(),
      device_fingerprint: v.device_fingerprint || null,
      ip_address: v.ip_address || null,
    })),
    matchDate
  )

  if (anomaly.isSuspicious) {
    // Si le vote fait partie d'un pattern suspect, réduire le poids
    const suspicionReduction = anomaly.confidence * 0.5 // Réduction max 50%
    weight *= (1 - suspicionReduction)
    reasons.push(`Pattern suspect détecté (confiance: ${(anomaly.confidence * 100).toFixed(0)}%)`)

    // Si vote extrême dans un pattern suspect, réduction supplémentaire
    if (note >= 4.8 || note <= 1.2) {
      weight *= 0.5 // Réduction de 50% supplémentaire
      reasons.push('Vote extrême dans pattern suspect')
    }

    // Si vote dans une fenêtre de temps suspecte (groupement)
    if (anomaly.details.timeGroupingDetected && vote.created_at) {
      const voteTime = typeof vote.created_at === 'string' 
        ? new Date(vote.created_at) 
        : vote.created_at
      const sortedVotes = [...allVotes].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        return dateA - dateB
      })

        for (let i = 0; i < sortedVotes.length; i++) {
          const created_at = sortedVotes[i].created_at
          const windowStart = created_at 
            ? (typeof created_at === 'string' ? new Date(created_at) : created_at instanceof Date ? created_at : new Date(created_at))
            : new Date()
          const windowEnd = new Date(windowStart.getTime() + 10 * 60 * 1000)

        if (voteTime >= windowStart && voteTime <= windowEnd) {
          const votesInWindow = sortedVotes.filter(v => {
            const vTime = v.created_at ? new Date(v.created_at) : new Date()
            return vTime >= windowStart && vTime <= windowEnd
          }).length

          if (votesInWindow / allVotes.length > 0.5 && votesInWindow >= 5) {
            weight *= 0.6 // Réduction de 40% pour votes groupés
            reasons.push('Vote dans fenêtre de groupement temporel')
            break
          }
        }
      }
    }
  }

  // 3. Vote très rapide après ouverture (possiblement non réfléchi)
  if (matchDate && vote.created_at) {
    const matchStartTime = typeof matchDate === 'string' ? new Date(matchDate) : matchDate
    const voteTime = typeof vote.created_at === 'string' ? new Date(vote.created_at) : vote.created_at
    const minutesAfterStart = (voteTime.getTime() - matchStartTime.getTime()) / (1000 * 60)

    // Si vote entre 30 et 32 minutes (très rapide), légère réduction
    if (minutesAfterStart >= 30 && minutesAfterStart <= 32) {
      weight *= 0.9 // Réduction de 10%
      reasons.push('Vote très rapide après ouverture')
    }
  }

  // 4. Vote modéré (entre 2.5 et 4.5) = bonus de crédibilité
  if (note >= 2.5 && note <= 4.5) {
    weight *= 1.1 // Bonus de 10% (max 1.0)
    if (weight > 1.0) weight = 1.0
  }

  // S'assurer que le poids reste entre 0.1 et 1.0
  weight = Math.max(0.1, Math.min(1.0, weight))

  return {
    weight: Math.round(weight * 100) / 100, // Arrondir à 2 décimales
    reason: reasons.length > 0 ? reasons.join('; ') : undefined,
  }
}

/**
 * Calcule la moyenne pondérée d'un ensemble de votes
 * 
 * @param votes - Tableau de votes avec leurs poids
 * @returns Moyenne pondérée
 */
export function calculateWeightedAverage(
  votes: Array<{ note_globale: number; weight: number }>
): number {
  if (votes.length === 0) return 0

  let weightedSum = 0
  let totalWeight = 0

  votes.forEach(({ note_globale, weight }) => {
    const note = typeof note_globale === 'string' 
      ? parseFloat(note_globale) 
      : Number(note_globale)
    
    if (!isNaN(note) && note > 0) {
      weightedSum += note * weight
      totalWeight += weight
    }
  })

  if (totalWeight === 0) return 0

  return weightedSum / totalWeight
}

/**
 * Calcule le nombre de votes effectifs (somme des poids)
 * Utile pour les calculs bayésiens
 * 
 * @param votes - Tableau de votes avec leurs poids
 * @returns Nombre de votes effectifs
 */
export function calculateEffectiveVoteCount(
  votes: Array<{ weight: number }>
): number {
  return votes.reduce((sum, vote) => sum + vote.weight, 0)
}

