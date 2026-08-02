import { In } from 'typeorm'
import { unstable_cache } from 'next/cache'
import { getDataSource } from '../db'
import { Arbitre, Match, Team, Vote } from '../entities'
import { toPlain, toPlainArray } from '../serialization'
import { fetchMatchesByTeam } from './matches'
import { fetchTopMatchesByCriteres } from './arbitres'

async function fetchTeamsUncached(limit?: number, offset?: number, q?: string) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Team>('teams')
  const qb = repo.createQueryBuilder('team').orderBy('team.nom', 'ASC')

  if (q) {
    qb.where('team.nom LIKE :q OR team.nom_en LIKE :q OR team.nom_ar LIKE :q OR team.abbr LIKE :q', {
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

export const fetchTeams = unstable_cache(
  fetchTeamsUncached,
  ['fetchTeams'],
  { revalidate: 120 }
)

export async function fetchTeamById(id: string) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Team>('teams')
  const row = await repo.findOne({
    where: { id },
  })
  return toPlain(row)
}

export async function fetchRefereeStatsForTeam(teamId: string) {
  const dataSource = await getDataSource()
  const matchRepo = dataSource.getRepository<Match>('matches')
  const voteRepo = dataSource.getRepository<Vote>('votes')

  // Récupérer tous les matchs de l'équipe
  const matches = await matchRepo.find({
    where: [
      { equipe_home_id: teamId },
      { equipe_away_id: teamId },
    ],
    relations: {
      arbitre: true,
    },
    select: ['id', 'arbitre_id'],
  })

  if (matches.length === 0) {
    return []
  }

  const matchIds = matches.map(m => m.id)
  const arbitreIds = Array.from(new Set(matches.map(m => m.arbitre_id).filter(Boolean) as string[]))

  if (arbitreIds.length === 0) {
    return []
  }

  // Récupérer tous les votes pour ces matchs
  const votes = await voteRepo.find({
    where: { match_id: In(matchIds) },
    select: ['id', 'match_id', 'arbitre_id', 'note_globale', 'created_at', 'device_fingerprint', 'ip_address'],
  })

  // Filtrer les votes suspects
  const { filterSuspiciousVotesBatch } = await import('../voteFiltering')
  type VoteWithFields = {
    id: string
    match_id?: string
    arbitre_id?: string
    note_globale: number | string
    created_at?: Date | string
    device_fingerprint?: string | null
    ip_address?: string | null
  }
  const plainVotes = toPlainArray(votes) as VoteWithFields[]
  const filteredVotes = await filterSuspiciousVotesBatch(plainVotes)

  // Grouper par arbitre
  const statsByArbitre = new Map<string, {
    arbitre_id: string
    matchIds: Set<string>
    notes: number[]
  }>()

  // Créer une map match_id -> arbitre_id
  const matchToArbitre = new Map<string, string>()
  matches.forEach(m => {
    if (m.arbitre_id) {
      matchToArbitre.set(m.id, m.arbitre_id)
    }
  })

  filteredVotes.forEach((vote: any) => {
    if (!vote.match_id || !vote.arbitre_id) return
    const arbitreId = vote.arbitre_id
    const note = typeof vote.note_globale === 'string' ? parseFloat(vote.note_globale) : Number(vote.note_globale)

    if (!statsByArbitre.has(arbitreId)) {
      statsByArbitre.set(arbitreId, {
        arbitre_id: arbitreId,
        matchIds: new Set(),
        notes: [],
      })
    }

    const stats = statsByArbitre.get(arbitreId)!
    stats.matchIds.add(vote.match_id)
    stats.notes.push(note)
  })

  // Récupérer les infos des arbitres
  const arbitreRepo = dataSource.getRepository<Arbitre>('arbitres')
  const arbitres = await arbitreRepo.find({
    where: { id: In(Array.from(statsByArbitre.keys())) },
  })
  const arbitresMap = new Map(arbitres.map(a => [a.id, a]))

  // Calculer les moyennes et formater les résultats
  const results = Array.from(statsByArbitre.entries()).map(([arbitreId, stats]) => {
    const arbitre = arbitresMap.get(arbitreId)
    const average = stats.notes.length > 0
      ? stats.notes.reduce((sum, n) => sum + n, 0) / stats.notes.length
      : 0

    return {
      arbitre: arbitre ? toPlain(arbitre) : null,
      matchCount: stats.matchIds.size,
      averageNote: Math.round(average * 100) / 100,
      voteCount: stats.notes.length,
    }
  })

  return results
}

export async function fetchTopMatchesForTeam(
  teamId: string,
  category: 'arbitre' | 'var' | 'assistant',
  limit: number = 5
) {
  const dataSource = await getDataSource()

  // Récupérer tous les matchs de l'équipe
  const matches = await fetchMatchesByTeam(teamId)
  if (matches.length === 0) {
    return []
  }

  const matchIds = matches.map(m => m.id)

  // Utiliser la fonction existante pour calculer les top matchs
  if (category === 'var' || category === 'assistant') {
    return await fetchTopMatchesByCriteres(matchIds, category, limit)
  }

  // Pour la catégorie 'arbitre', calculer la moyenne globale
  const voteRepo = dataSource.getRepository<Vote>('votes')
  const votes = await voteRepo.find({
    where: { match_id: In(matchIds) },
    select: ['id', 'match_id', 'note_globale', 'created_at', 'device_fingerprint', 'ip_address'],
  })

  // Filtrer les votes suspects
  const { filterSuspiciousVotesBatch } = await import('../voteFiltering')
  type VoteWithFields = {
    id: string
    match_id?: string
    note_globale: number | string
    created_at?: Date | string
    device_fingerprint?: string | null
    ip_address?: string | null
  }
  const plainVotes = toPlainArray(votes) as VoteWithFields[]
  const filteredVotes = await filterSuspiciousVotesBatch(plainVotes)

  // Grouper par match et calculer les moyennes
  const matchScores = new Map<string, {
    match: any
    notes: number[]
    voteCount: number
  }>()

  const matchMap = new Map(matches.map(m => [m.id, m]))

  filteredVotes.forEach((vote: any) => {
    if (!vote.match_id) return
    const matchId = vote.match_id
    const note = typeof vote.note_globale === 'string' ? parseFloat(vote.note_globale) : Number(vote.note_globale)

    if (!matchScores.has(matchId)) {
      matchScores.set(matchId, {
        match: matchMap.get(matchId),
        notes: [],
        voteCount: 0,
      })
    }

    const data = matchScores.get(matchId)!
    data.notes.push(note)
    data.voteCount++
  })

  // Calculer les moyennes et trier
  const results = Array.from(matchScores.entries())
    .map(([matchId, data]) => {
      const average = data.notes.length > 0
        ? data.notes.reduce((sum, n) => sum + n, 0) / data.notes.length
        : 0

      return {
        match: data.match,
        average: Math.round(average * 100) / 100,
        voteCount: data.voteCount,
      }
    })
    .filter(item => item.voteCount > 0)
    .sort((a, b) => b.average - a.average)
    .slice(0, limit)

  return results
}
