import { getDataSource } from './db'
import { Vote, Match, Arbitre, Journee } from './entities'
import { toPlain, toPlainArray } from './serialization'
import { roundNote } from './utils'

export interface VoteFilters {
  matchId?: string
  arbitreId?: string
  journeeId?: string
  dateFrom?: string
  dateTo?: string
  voteStatus?: 'all' | 'voted' | 'not_voted'
  limit?: number
  offset?: number
}

export interface VoteUpdateInput {
  criteres?: Record<string, number>
  note_globale?: number
}

/**
 * Liste tous les votes avec filtres et pagination
 */
export async function listVotesForAdmin(filters: VoteFilters = {}, leagueId?: string | null) {
  const dataSource = await getDataSource()
  const voteRepo = dataSource.getRepository<Vote>('votes')

  const qb = voteRepo
    .createQueryBuilder('vote')
    .leftJoinAndSelect('vote.match', 'match')
    .leftJoinAndSelect('match.equipe_home', 'equipe_home')
    .leftJoinAndSelect('match.equipe_away', 'equipe_away')
    .leftJoinAndSelect('match.journee', 'journee')
    .leftJoinAndSelect('journee.saison', 'saison')
    .leftJoinAndSelect('vote.arbitre', 'arbitre')
    .orderBy('vote.created_at', 'DESC')

  // Filtre par ligue
  if (leagueId) {
    qb.andWhere('saison.league_id = :leagueId', { leagueId })
  }

  // Filtre par match
  if (filters.matchId) {
    qb.andWhere('vote.match_id = :matchId', { matchId: filters.matchId })
  }

  // Filtre par arbitre
  if (filters.arbitreId) {
    qb.andWhere('vote.arbitre_id = :arbitreId', { arbitreId: filters.arbitreId })
  }

  // Filtre par journée
  if (filters.journeeId) {
    qb.andWhere('match.journee_id = :journeeId', { journeeId: filters.journeeId })
  }

  // Filtre par date de vote (début)
  if (filters.dateFrom) {
    qb.andWhere('vote.created_at >= :dateFrom', { dateFrom: filters.dateFrom })
  }

  // Filtre par date de vote (fin)
  if (filters.dateTo) {
    qb.andWhere('vote.created_at <= :dateTo', { dateTo: filters.dateTo })
  }

  // Compter le total avant pagination
  const total = await qb.getCount()

  // Pagination
  if (filters.limit) {
    qb.take(filters.limit)
  }
  if (filters.offset) {
    qb.skip(filters.offset)
  }

  const votes = await qb.getMany()

  return {
    votes: toPlainArray(votes).map((vote: any) => ({
      ...vote,
      note_globale: typeof vote.note_globale === 'string' 
        ? parseFloat(vote.note_globale) 
        : Number(vote.note_globale),
    })),
    total,
  }
}

/**
 * Récupère un vote par son ID
 */
export async function getVoteById(id: string, leagueId?: string | null) {
  const dataSource = await getDataSource()
  const voteRepo = dataSource.getRepository<Vote>('votes')

  const qb = voteRepo
    .createQueryBuilder('vote')
    .leftJoinAndSelect('vote.match', 'match')
    .leftJoinAndSelect('match.equipe_home', 'equipe_home')
    .leftJoinAndSelect('match.equipe_away', 'equipe_away')
    .leftJoinAndSelect('match.journee', 'journee')
    .leftJoinAndSelect('journee.saison', 'saison')
    .leftJoinAndSelect('vote.arbitre', 'arbitre')
    .where('vote.id = :id', { id })

  if (leagueId) {
    qb.andWhere('saison.league_id = :leagueId', { leagueId })
  }

  const vote = await qb.getOne()

  if (!vote) {
    return null
  }

  const plain = toPlain(vote) as any
  return {
    ...plain,
    note_globale: typeof plain.note_globale === 'string' 
      ? parseFloat(plain.note_globale) 
      : Number(plain.note_globale),
  }
}

/**
 * Met à jour un vote (critères et recalcule note_globale automatiquement)
 */
export async function updateVoteAdmin(id: string, payload: VoteUpdateInput, leagueId?: string | null) {
  const dataSource = await getDataSource()
  const voteRepo = dataSource.getRepository<Vote>('votes')

  // Vérifier que le vote existe et appartient à la ligue
  const existingVote = await getVoteById(id, leagueId)
  if (!existingVote) {
    throw new Error('Vote introuvable')
  }

  const updateData: Partial<Vote> = {}

  if (payload.criteres !== undefined) {
    updateData.criteres = payload.criteres
    
    // Recalculer automatiquement la note_globale
    const values = Object.values(payload.criteres).filter((v) => v > 0)
    if (values.length > 0) {
      const sum = values.reduce((acc, val) => acc + val, 0)
      updateData.note_globale = roundNote(sum / values.length)
    }
  }

  if (Object.keys(updateData).length > 0) {
    await voteRepo.update(id, updateData)
  }

  return await getVoteById(id, leagueId)
}

/**
 * Supprime un vote
 */
export async function deleteVoteAdmin(id: string, leagueId?: string | null) {
  const dataSource = await getDataSource()
  const voteRepo = dataSource.getRepository<Vote>('votes')

  // Vérifier que le vote existe et appartient à la ligue
  const existingVote = await getVoteById(id, leagueId)
  if (!existingVote) {
    throw new Error('Vote introuvable')
  }

  await voteRepo.delete(id)
  return { success: true }
}

/**
 * Supprime plusieurs votes
 */
export async function deleteMultipleVotesAdmin(ids: string[], leagueId?: string | null) {
  if (!ids || ids.length === 0) {
    throw new Error('Aucun vote sélectionné')
  }

  const dataSource = await getDataSource()
  const voteRepo = dataSource.getRepository<Vote>('votes')

  // Vérifier que tous les votes existent et appartiennent à la ligue
  if (leagueId) {
    const qb = voteRepo
      .createQueryBuilder('vote')
      .leftJoin('vote.match', 'match')
      .leftJoin('match.journee', 'journee')
      .leftJoin('journee.saison', 'saison')
      .where('vote.id IN (:...ids)', { ids })
      .andWhere('saison.league_id = :leagueId', { leagueId })

    const count = await qb.getCount()
    if (count !== ids.length) {
      throw new Error('Certains votes n\'appartiennent pas à la ligue sélectionnée')
    }
  }

  await voteRepo.delete(ids)
  return { success: true, deleted: ids.length }
}

/**
 * Récupère la liste des matchs pour le filtre avec nombre de votes
 */
export async function getMatchesForFilter(leagueId?: string | null) {
  const dataSource = await getDataSource()
  const matchRepo = dataSource.getRepository<Match>('matches')

  const qb = matchRepo
    .createQueryBuilder('match')
    .leftJoinAndSelect('match.equipe_home', 'equipe_home')
    .leftJoinAndSelect('match.equipe_away', 'equipe_away')
    .leftJoinAndSelect('match.journee', 'journee')
    .leftJoinAndSelect('journee.saison', 'saison')
    .addSelect(
      '(SELECT COUNT(*) FROM votes v WHERE v.match_id = match.id)',
      'vote_count'
    )
    .orderBy('journee.numero', 'DESC')
    .addOrderBy('match.date', 'DESC')
    .take(200)

  if (leagueId) {
    qb.andWhere('saison.league_id = :leagueId', { leagueId })
  }

  const results = await qb.getRawAndEntities()
  
  // Combiner les entités avec le count
  const matchesWithVoteCount = results.entities.map((match, index) => {
    const plain = toPlain(match) as any
    plain.vote_count = parseInt(results.raw[index]?.vote_count || '0', 10)
    return plain
  })

  return matchesWithVoteCount
}

/**
 * Récupère la liste des arbitres pour le filtre
 */
export async function getArbitresForFilter(leagueId?: string | null) {
  const dataSource = await getDataSource()
  const arbitreRepo = dataSource.getRepository<Arbitre>('arbitres')

  const arbitres = await arbitreRepo.find({
    order: { nom: 'ASC' },
  })

  return toPlainArray(arbitres)
}

/**
 * Récupère la liste des journées pour le filtre
 */
export async function getJourneesForFilter(leagueId?: string | null) {
  const dataSource = await getDataSource()
  const journeeRepo = dataSource.getRepository<Journee>('journees')

  const qb = journeeRepo
    .createQueryBuilder('journee')
    .leftJoinAndSelect('journee.saison', 'saison')
    .orderBy('journee.numero', 'DESC')

  if (leagueId) {
    qb.andWhere('saison.league_id = :leagueId', { leagueId })
  }

  const journees = await qb.getMany()
  return toPlainArray(journees)
}

