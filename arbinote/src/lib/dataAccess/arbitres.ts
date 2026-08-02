import { In } from 'typeorm'
import { unstable_cache } from 'next/cache'
import { getDataSource } from '../db'
import { Arbitre, CritereDefinitionEntity, Match, Vote } from '../entities'
import { toPlain, toPlainArray } from '../serialization'

export async function fetchArbitreById(id: string) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Arbitre>('arbitres')
  const row = await repo.findOne({ where: { id } })
  return toPlain(row)
}

async function fetchArbitresUncached(limit?: number, offset?: number, q?: string) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Arbitre>('arbitres')
  const qb = repo.createQueryBuilder('arbitre').orderBy('arbitre.nom', 'ASC')

  if (q) {
    qb.where('arbitre.nom LIKE :q OR arbitre.nom_en LIKE :q OR arbitre.nom_ar LIKE :q', {
      q: `%${q}%`,
    })
  }
  if (limit !== undefined) {
    qb.take(limit)
  }
  if (offset !== undefined) {
    qb.skip(offset)
  }

  const [rows, total] = await qb.getManyAndCount()
  return { rows: toPlainArray(rows), total }
}

export const fetchArbitres = unstable_cache(
  fetchArbitresUncached,
  ['fetchArbitres'],
  { revalidate: 120 }
)

export async function fetchMatchesByArbitre(arbitreId: string) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Match>('matches')
  const rows = await repo.find({
    where: { arbitre_id: arbitreId },
    relations: {
      equipe_home: true,
      equipe_away: true,
      journee: { saison: true },
    },
    order: { date: 'DESC' },
  })
  return toPlainArray(rows)
}

/**
 * Logique commune à fetchTopMatchesByCriteres et fetchTopMatchesByCriteresBayesian :
 * récupère les votes des matchs donnés, filtre les votes suspects, calcule le poids
 * de chaque vote puis la moyenne pondérée par match pour la catégorie de critères
 * demandée. Les deux fonctions publiques ne diffèrent que par la transformation
 * finale (moyenne brute triée vs lissage bayésien), donc tout le reste est factorisé
 * ici pour éviter la duplication.
 */
async function computeWeightedCriteresScores(
  matchIds: string[],
  critereCategory: 'var' | 'assistant'
): Promise<Array<{ match: any; averageBrute: number; totalWeight: number; voteCount: number }>> {
  if (matchIds.length === 0) {
    return []
  }

  const dataSource = await getDataSource()

  // Récupérer les critères de la catégorie
  const critereRepo = dataSource.getRepository<CritereDefinitionEntity>('critere_definitions')
  const criteres = await critereRepo.find({
    where: { categorie: critereCategory },
  })
  const critereIds = criteres.map((c) => c.id)

  if (critereIds.length === 0) {
    return []
  }

  // Récupérer tous les votes pour ces matchs avec les relations
  const voteRepo = dataSource.getRepository<Vote>('votes')
  const matchRepo = dataSource.getRepository<Match>('matches')
  const votes = await voteRepo.find({
    where: { match_id: In(matchIds) },
    select: ['id', 'match_id', 'criteres', 'note_globale', 'created_at', 'device_fingerprint', 'ip_address'],
    relations: ['match', 'match.journee', 'match.journee.saison', 'match.equipe_home', 'match.equipe_away', 'match.arbitre'],
  })

  // Filtrer les votes suspects
  const { filterSuspiciousVotesBatch } = await import('../voteFiltering')
  type VoteWithFields = {
    id: string
    match_id?: string
    note_globale: number | string
    criteres: any
    created_at?: Date | string
    device_fingerprint?: string | null
    ip_address?: string | null
  }
  const plainVotes = toPlainArray(votes) as VoteWithFields[]
  const filteredVotes = await filterSuspiciousVotesBatch(plainVotes)

  // Créer une map des votes originaux pour récupérer les relations match
  const votesMap = new Map(votes.map(v => [v.id, v]))

  // Récupérer les dates des matchs pour la pondération
  const matches = await matchRepo.find({
    where: { id: In(matchIds) },
    select: ['id', 'date'],
  })
  const matchDates = new Map(matches.map(m => [m.id, m.date]))

  // Calculer les poids pour chaque vote
  const { calculateVoteWeight } = await import('../voteWeighting')
  const { detectVoteAnomalies } = await import('../voteAnomalyDetection')
  const votesByMatch = new Map<string, typeof filteredVotes>()
  filteredVotes.forEach((vote: any) => {
    if (vote.match_id) {
      const matchVotes = votesByMatch.get(vote.match_id) || []
      matchVotes.push(vote)
      votesByMatch.set(vote.match_id, matchVotes)
    }
  })

  const votesWithWeights = new Map<string, number>()
  for (const [matchId, matchVotes] of votesByMatch.entries()) {
    const matchDate = matchDates.get(matchId)
    const votesForAnalysis = matchVotes.map((v: any) => ({
      note_globale: typeof v.note_globale === 'string' ? parseFloat(v.note_globale) : Number(v.note_globale),
      created_at: v.created_at || new Date(),
      device_fingerprint: v.device_fingerprint || null,
      ip_address: v.ip_address || null,
    }))

    // La détection d'anomalies ne dépend que du match : calculée une seule fois
    // par match plutôt qu'une fois par vote (évite un O(n²) inutile).
    const anomaly = detectVoteAnomalies(votesForAnalysis, matchDate)

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
      votesWithWeights.set(vote.id, weightResult.weight)
    }
  }

  // Grouper les votes par match et calculer la moyenne pondérée pour chaque critère
  const matchScores = new Map<
    string,
    {
      match: any
      weightedScores: number[]
      totalWeights: number[]
      voteCount: number
    }
  >()

  filteredVotes.forEach((vote: any) => {
    const matchId = vote.match_id
    const weight = votesWithWeights.get(vote.id) ?? 1.0
    const criteresData = vote.criteres as Record<string, number>

    // Calculer la moyenne des critères de la catégorie pour ce vote
    const categoryScores: number[] = []
    critereIds.forEach((critereId) => {
      if (criteresData[critereId] !== undefined && criteresData[critereId] !== null) {
        categoryScores.push(Number(criteresData[critereId]))
      }
    })

    if (categoryScores.length === 0) return

    const voteAverage = categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length

    if (!matchScores.has(matchId)) {
      const originalVote = votesMap.get(vote.id)
      matchScores.set(matchId, {
        match: originalVote?.match,
        weightedScores: [],
        totalWeights: [],
        voteCount: 0,
      })
    }

    const matchData = matchScores.get(matchId)!
    matchData.weightedScores.push(voteAverage * weight)
    matchData.totalWeights.push(weight)
    matchData.voteCount++
  })

  return Array.from(matchScores.values())
    .map((data) => {
      const totalWeight = data.totalWeights.reduce((sum, w) => sum + w, 0)
      const weightedSum = data.weightedScores.reduce((sum, s) => sum + s, 0)
      const averageBrute = totalWeight > 0 ? weightedSum / totalWeight : 0

      return {
        match: toPlain(data.match),
        averageBrute,
        totalWeight,
        voteCount: data.voteCount,
      }
    })
    .filter((item) => item.voteCount > 0) // Seulement les matchs avec au moins un vote
}

async function fetchTopMatchesByCriteresUncached(
  matchIds: string[],
  critereCategory: 'var' | 'assistant',
  limit: number = 5
) {
  const scores = await computeWeightedCriteresScores(matchIds, critereCategory)

  return scores
    .map(({ match, averageBrute, voteCount }) => ({
      match,
      average: Math.round(averageBrute * 100) / 100,
      voteCount,
    }))
    .sort((a, b) => b.average - a.average) // Trier par moyenne décroissante
    .slice(0, limit) // Top N
}

export const fetchTopMatchesByCriteres = unstable_cache(
  fetchTopMatchesByCriteresUncached,
  ['fetchTopMatchesByCriteres'],
  { revalidate: 120 }
)

async function fetchTopMatchesByCriteresBayesianUncached(
  matchIds: string[],
  critereCategory: 'var' | 'assistant',
  limit: number = 5,
  m: number = 3.8,
  C: number = 20
) {
  const scores = await computeWeightedCriteresScores(matchIds, critereCategory)

  return scores
    .map(({ match, averageBrute, totalWeight, voteCount }) => {
      // Calculer le score bayésien avec le nombre de votes effectifs (somme des poids)
      const averageBayesian = (m * C + averageBrute * totalWeight) / (totalWeight + C)

      return {
        match,
        average: Math.round(averageBayesian * 100) / 100, // Utiliser le score bayésien
        averageBrute: Math.round(averageBrute * 100) / 100, // Garder la moyenne brute pour référence
        voteCount, // Nombre réel de votes (pour affichage)
      }
    })
    .sort((a, b) => {
      // Trier par score bayésien décroissant
      if (b.average !== a.average) {
        return b.average - a.average
      }
      // En cas d'égalité, trier par nombre de votes décroissant
      return b.voteCount - a.voteCount
    })
    .slice(0, limit) // Top N
}

export const fetchTopMatchesByCriteresBayesian = unstable_cache(
  fetchTopMatchesByCriteresBayesianUncached,
  ['fetchTopMatchesByCriteresBayesian'],
  { revalidate: 120 }
)
