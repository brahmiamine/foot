import { In } from 'typeorm'
import { getDataSource } from './db'
import { Vote, Match } from './entities'
import { toPlainArray } from './serialization'

/**
 * Valeurs par défaut pour le calcul bayésien
 */
export const DEFAULT_BAYESIAN_M = 3.8 // Moyenne générale du site
export const DEFAULT_BAYESIAN_C = 20 // Nombre minimal de votes pour être fiable

/**
 * Calcule le score bayésien pour un arbitre
 * 
 * Formule: note_bayesienne = (m * C + moyenne_brute * n) / (n + C)
 * 
 * @param moyenne - Moyenne brute des votes de l'arbitre
 * @param nbVotes - Nombre de votes de l'arbitre
 * @param m - Moyenne générale du site (défaut: 3.8)
 * @param C - Nombre minimal de votes pour être fiable (défaut: 20)
 * @returns Le score bayésien calculé
 */
export function computeBayesianRating(
  moyenne: number,
  nbVotes: number,
  m: number = DEFAULT_BAYESIAN_M,
  C: number = DEFAULT_BAYESIAN_C
): number {
  if (nbVotes < 0) {
    throw new Error('Le nombre de votes ne peut pas être négatif')
  }

  if (nbVotes === 0) {
    // Si aucun vote, retourner la moyenne générale
    return m
  }

  const noteBayesienne = (m * C + moyenne * nbVotes) / (nbVotes + C)

  // Arrondir à 2 décimales
  return Math.round(noteBayesienne * 100) / 100
}

/**
 * Interface pour les votes en entrée
 */
export interface VoteInput {
  arbitre_id: string
  note_globale: number
  weight?: number // Poids du vote (0-1), optionnel pour rétrocompatibilité
}

/**
 * Interface pour le résultat du classement
 */
export interface RankingResult {
  arbitre_id: string
  moyenne_brute: number
  nb_votes: number
  note_bayesienne: number
}

/**
 * Calcule le classement des arbitres à partir des votes en utilisant le score bayésien
 * 
 * @param votes - Tableau de votes avec arbitre_id et note_globale
 * @param m - Moyenne générale du site (défaut: 3.8)
 * @param C - Nombre minimal de votes pour être fiable (défaut: 20)
 * @returns Tableau trié par note_bayesienne décroissante
 */
export function computeRankingFromVotes(
  votes: VoteInput[],
  m: number = DEFAULT_BAYESIAN_M,
  C: number = DEFAULT_BAYESIAN_C
): RankingResult[] {
  // Regrouper les votes par arbitre_id avec pondération
  const votesByArbitre = new Map<
    string,
    {
      weightedTotal: number
      totalWeight: number
      count: number
    }
  >()

  votes.forEach((vote) => {
    const arbitreId = vote.arbitre_id
    const note = Number(vote.note_globale)
    const weight = vote.weight ?? 1.0 // Poids par défaut = 1.0 si non spécifié

    if (isNaN(note)) {
      console.warn(`Vote invalide ignoré pour arbitre ${arbitreId}: note_globale = ${vote.note_globale}`)
      return
    }

    const current = votesByArbitre.get(arbitreId) ?? {
      weightedTotal: 0,
      totalWeight: 0,
      count: 0,
    }

    current.weightedTotal += note * weight
    current.totalWeight += weight
    current.count += 1

    votesByArbitre.set(arbitreId, current)
  })

  // Calculer la moyenne pondérée brute et le score bayésien pour chaque arbitre
  const ranking: RankingResult[] = Array.from(votesByArbitre.entries()).map(
    ([arbitre_id, stats]) => {
      // Moyenne pondérée
      const moyenne_brute = stats.totalWeight > 0 
        ? stats.weightedTotal / stats.totalWeight 
        : 0
      
      // Nombre de votes effectifs (somme des poids) pour le calcul bayésien
      const nb_votes_effectifs = stats.totalWeight
      const note_bayesienne = computeBayesianRating(moyenne_brute, nb_votes_effectifs, m, C)

      return {
        arbitre_id,
        moyenne_brute: Math.round(moyenne_brute * 100) / 100,
        nb_votes: stats.count, // Nombre réel de votes (pour affichage)
        note_bayesienne,
      }
    }
  )

  // Trier par note_bayesienne décroissante
  ranking.sort((a, b) => {
    // D'abord par note_bayesienne décroissante
    if (b.note_bayesienne !== a.note_bayesienne) {
      return b.note_bayesienne - a.note_bayesienne
    }
    // En cas d'égalité, trier par nombre de votes décroissant
    return b.nb_votes - a.nb_votes
  })

  return ranking
}

/**
 * Récupère tous les votes groupés depuis la base de données
 * Calcule les poids pour chaque vote et applique la pondération
 * 
 * @returns Promise d'un tableau de votes avec arbitre_id, note_globale et weight
 */
export async function fetchVotesGrouped(): Promise<VoteInput[]> {
  const dataSource = await getDataSource()
  const voteRepo = dataSource.getRepository<Vote>('votes')
  const matchRepo = dataSource.getRepository<Match>('matches')

  // Récupérer tous les votes avec les informations nécessaires pour la pondération
  const votes = await voteRepo.find({
    select: ['arbitre_id', 'note_globale', 'id', 'match_id', 'created_at', 'device_fingerprint', 'ip_address'],
  })

  // Convertir en format plain
  const plainVotes = toPlainArray(votes) as Array<{
    id: string
    arbitre_id: string
    note_globale: number | string
    match_id?: string
    created_at?: Date | string
    device_fingerprint?: string | null
    ip_address?: string | null
  }>

  // Filtrer les votes suspects (exclusion complète)
  const { filterSuspiciousVotesBatch } = await import('./voteFiltering')
  const filteredVotes = await filterSuspiciousVotesBatch(plainVotes)

  // Grouper les votes par match pour calculer les poids
  const votesByMatch = new Map<string, typeof filteredVotes>()
  filteredVotes.forEach((vote) => {
    if (vote.match_id) {
      const matchVotes = votesByMatch.get(vote.match_id) || []
      matchVotes.push(vote)
      votesByMatch.set(vote.match_id, matchVotes)
    }
  })

  // Récupérer les dates des matchs
  const matchIds = Array.from(votesByMatch.keys())
  const matches = await matchRepo.find({
    where: { id: In(matchIds) },
    select: ['id', 'date'],
  })
  const matchDates = new Map(matches.map(m => [m.id, m.date]))

  // Calculer les poids pour chaque vote
  const { calculateVoteWeight } = await import('./voteWeighting')
  const { detectVoteAnomalies } = await import('./voteAnomalyDetection')
  const votesWithWeights: VoteInput[] = []

  for (const [matchId, matchVotes] of votesByMatch.entries()) {
    const matchDate = matchDates.get(matchId)

    // Préparer les votes pour l'analyse
    const votesForAnalysis = matchVotes.map((v) => ({
      note_globale: typeof v.note_globale === 'string' ? parseFloat(v.note_globale) : Number(v.note_globale),
      created_at: v.created_at || new Date(),
      device_fingerprint: v.device_fingerprint || null,
      ip_address: v.ip_address || null,
    }))

    // La détection d'anomalies ne dépend que du match : on la calcule une seule fois
    // au lieu de la refaire pour chaque vote (évite un recalcul O(n) par vote, soit
    // O(n²) au total pour un match de n votes).
    const anomaly = detectVoteAnomalies(votesForAnalysis, matchDate)

    // Calculer le poids pour chaque vote du match
    for (const vote of matchVotes) {
      const weightResult = calculateVoteWeight(
        {
          note_globale: typeof vote.note_globale === 'string' ? parseFloat(vote.note_globale) : Number(vote.note_globale),
          match_id: vote.match_id,
          created_at: vote.created_at,
          device_fingerprint: vote.device_fingerprint,
          ip_address: vote.ip_address,
        },
        votesForAnalysis,
        matchDate,
        anomaly
      )

      votesWithWeights.push({
        arbitre_id: vote.arbitre_id,
        note_globale: typeof vote.note_globale === 'string'
          ? parseFloat(vote.note_globale)
          : Number(vote.note_globale),
        weight: weightResult.weight,
      })
    }
  }

  return votesWithWeights
}

/**
 * Interface pour les entrées de classement avec informations d'arbitre
 */
export interface BayesianRankingEntry {
  arbitreId: string
  nom: string
  nom_en?: string | null
  nom_ar?: string | null
  photo_url?: string | null
  moyenne: number // Moyenne brute
  moyenne_bayesienne: number // Score bayésien
  votes: number
  criteres?: Record<string, number | null>
}

/**
 * Construit un classement d'arbitres avec score bayésien à partir des votes
 * Compatible avec l'interface RankingEntry existante mais utilise le score bayésien pour le tri
 * 
 * @param votes - Tableau de votes avec arbitre et note_globale
 * @param options - Options pour filtrer par critères
 * @param m - Moyenne générale du site (défaut: 3.8)
 * @param C - Nombre minimal de votes pour être fiable (défaut: 20)
 * @returns Tableau trié par score bayésien décroissant
 */
export function buildBayesianRanking(
  votes: Array<{ arbitre?: { id: string; nom: string; nom_en?: string | null; nom_ar?: string | null; photo_url?: string | null } | null; note_globale: number; criteres?: Record<string, number>; weight?: number }>,
  options: {
    criteres?: Array<{ id: string; categorie: string }>
    includeCategories?: string[]
    /** ARBI-002 — un arbitre avec moins de votes que ce seuil n'apparaît pas dans le classement. */
    minVotes?: number
  } = {},
  m: number = DEFAULT_BAYESIAN_M,
  C: number = DEFAULT_BAYESIAN_C
): BayesianRankingEntry[] {
  const criteresMeta = new Map(
    (options.criteres ?? []).map((critere) => [critere.id, critere])
  )
  const allowedCategories = options.includeCategories
    ? new Set(options.includeCategories)
    : null

  const map = new Map<
    string,
    {
      nom: string
      nom_en?: string | null
      nom_ar?: string | null
      photo_url?: string | null
      weightedTotal: number
      totalWeight: number
      count: number
      criteres: Record<string, { weightedTotal: number; totalWeight: number; count: number }>
    }
  >()

  votes.forEach((vote) => {
    if (!vote.arbitre) return
    const weight = vote.weight ?? 1.0 // Poids par défaut = 1.0
    const current = map.get(vote.arbitre.id) ?? {
      nom: vote.arbitre.nom,
      nom_en: vote.arbitre.nom_en,
      nom_ar: vote.arbitre.nom_ar,
      photo_url: vote.arbitre.photo_url,
      weightedTotal: 0,
      totalWeight: 0,
      count: 0,
      criteres: {},
    }

    if (!current.nom_en && vote.arbitre.nom_en) {
      current.nom_en = vote.arbitre.nom_en
    }
    if (!current.nom_ar && vote.arbitre.nom_ar) {
      current.nom_ar = vote.arbitre.nom_ar
    }
    if (!current.photo_url && vote.arbitre.photo_url) {
      current.photo_url = vote.arbitre.photo_url
    }

    const note = Number(vote.note_globale)
    current.weightedTotal += note * weight
    current.totalWeight += weight
    current.count += 1

    if (vote.criteres && typeof vote.criteres === 'object') {
      Object.entries(vote.criteres as Record<string, number>).forEach(
        ([key, value]) => {
          const critereMeta = criteresMeta.get(key)
          if (allowedCategories) {
            if (!critereMeta || !allowedCategories.has(critereMeta.categorie)) {
              return
            }
          }
          if (value === undefined || value === null) return
          const parsed = Number(value)
          if (Number.isNaN(parsed)) return
          current.criteres[key] = current.criteres[key] ?? { weightedTotal: 0, totalWeight: 0, count: 0 }
          current.criteres[key].weightedTotal += parsed * weight
          current.criteres[key].totalWeight += weight
          current.criteres[key].count += 1
        }
      )
    }

    map.set(vote.arbitre.id, current)
  })

  return Array.from(map.entries())
    .filter(([, value]) => value.count >= (options.minVotes ?? 0))
    .map(([arbitreId, value]) => {
      // Moyenne pondérée
      const moyenne_brute = value.totalWeight > 0
        ? value.weightedTotal / value.totalWeight 
        : 0
      // Nombre de votes effectifs (somme des poids) pour le calcul bayésien
      const nb_votes_effectifs = value.totalWeight
      const moyenne_bayesienne = computeBayesianRating(moyenne_brute, nb_votes_effectifs, m, C)

      const criteresAverages: Record<string, number | null> = {}
      Object.keys(value.criteres).forEach((key) => {
        const stat = value.criteres[key]
        if (!stat || stat.count === 0 || stat.totalWeight === 0) {
          criteresAverages[key] = null
          return
        }
        // Moyenne pondérée pour les critères
        criteresAverages[key] =
          Math.round((stat.weightedTotal / stat.totalWeight) * 100) / 100
      })

      return {
        arbitreId,
        nom: value.nom,
        nom_en: value.nom_en,
        nom_ar: value.nom_ar,
        photo_url: value.photo_url,
        moyenne: Math.round(moyenne_brute * 100) / 100,
        moyenne_bayesienne,
        votes: value.count, // Nombre réel de votes (pour affichage)
        criteres: criteresAverages,
      }
    })
    .sort((a, b) => {
      // Trier par score bayésien décroissant
      if (b.moyenne_bayesienne !== a.moyenne_bayesienne) {
        return b.moyenne_bayesienne - a.moyenne_bayesienne
      }
      // En cas d'égalité, trier par nombre de votes décroissant
      return b.votes - a.votes
    })
}

