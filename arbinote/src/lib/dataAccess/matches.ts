import { In } from 'typeorm'
import { unstable_cache } from 'next/cache'
import { getDataSource } from '../db'
import { Match, Vote } from '../entities'
import { toPlain, toPlainArray } from '../serialization'

async function fetchMatchesByJourneeUncached(journeeId: string) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Match>('matches')
  const rows = await repo.find({
    where: { journee_id: journeeId },
    relations: {
      journee: { saison: true },
      equipe_home: true,
      equipe_away: true,
      arbitre: true,
    },
    order: { date: 'ASC' },
  })
  return toPlainArray(rows)
}

export const fetchMatchesByJournee = unstable_cache(
  fetchMatchesByJourneeUncached,
  ['fetchMatchesByJournee'],
  { revalidate: 120 }
)

/**
 * Récupère les matches d'une journée avec le vote de l'utilisateur (si existe) en JSON nested
 * Utilise une jointure SQL pour inclure le vote de l'utilisateur basé sur le fingerprint
 */
export async function fetchMatchesByJourneeWithUserVote(
  journeeId: string,
  fingerprint: string | null
) {
  const dataSource = await getDataSource()
  const matchRepo = dataSource.getRepository<Match>('matches')

  // Récupérer les matches avec leurs relations
  const matches = await matchRepo.find({
    where: { journee_id: journeeId },
    relations: {
      journee: { saison: true },
      equipe_home: true,
      equipe_away: true,
      arbitre: true,
    },
    order: { date: 'ASC' },
  })

  // Si pas de fingerprint, retourner les matches sans votes
  if (!fingerprint) {
    const plainMatches = toPlainArray(matches)
    return plainMatches.map((match: any) => ({
      ...match,
      user_vote: null,
    }))
  }

  // Récupérer les votes de l'utilisateur pour ces matches en une seule requête
  const matchIds = matches.map((m) => m.id)
  const voteRepo = dataSource.getRepository<Vote>('votes')

  const userVotes = matchIds.length > 0
    ? await voteRepo.find({
      where: {
        match_id: In(matchIds),
        device_fingerprint: fingerprint,
      },
      order: { created_at: 'DESC' },
    })
    : []

  // Créer un Map pour accès rapide : match_id -> vote
  const voteMap = new Map<string, Vote>()
  userVotes.forEach((vote) => {
    // Garder seulement le vote le plus récent par match
    if (!voteMap.has(vote.match_id)) {
      voteMap.set(vote.match_id, vote)
    }
  })

  // Combiner les matches avec les votes utilisateur
  const plainMatches = toPlainArray(matches)
  const matchesWithVotes = plainMatches.map((match: any) => {
    const userVote = voteMap.get(match.id)

    if (userVote) {
      const plainVote = toPlain(userVote)
      match.user_vote = {
        id: plainVote.id,
        match_id: plainVote.match_id,
        arbitre_id: plainVote.arbitre_id,
        criteres: plainVote.criteres,
        note_globale: typeof plainVote.note_globale === 'string'
          ? parseFloat(plainVote.note_globale)
          : plainVote.note_globale,
        device_fingerprint: plainVote.device_fingerprint,
        ip_address: plainVote.ip_address,
        moderation_status: plainVote.moderation_status,
        created_at: plainVote.created_at,
      }
    } else {
      match.user_vote = null
    }

    return match
  })

  return matchesWithVotes
}

async function fetchMatchesUncached(
  limit = 20,
  leagueId?: string | null,
  offset = 0,
  q?: string
) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Match>('matches')
  const qb = repo
    .createQueryBuilder('match')
    .leftJoinAndSelect('match.journee', 'journee')
    .leftJoinAndSelect('journee.saison', 'saison')
    .leftJoinAndSelect('match.equipe_home', 'equipe_home')
    .leftJoinAndSelect('match.equipe_away', 'equipe_away')
    .leftJoinAndSelect('match.arbitre', 'arbitre')
    .orderBy('match.date', 'DESC')
    .take(limit)
    .skip(offset)

  if (leagueId) {
    qb.andWhere('saison.league_id = :leagueId', { leagueId })
  }

  if (q) {
    qb.andWhere(
      `(equipe_home.nom LIKE :q OR equipe_home.nom_en LIKE :q OR equipe_home.nom_ar LIKE :q OR equipe_home.abbr LIKE :q
        OR equipe_away.nom LIKE :q OR equipe_away.nom_en LIKE :q OR equipe_away.nom_ar LIKE :q OR equipe_away.abbr LIKE :q)`,
      { q: `%${q}%` }
    )
  }

  const [rows, total] = await qb.getManyAndCount()
  return { rows: toPlainArray(rows), total }
}

export const fetchMatches = unstable_cache(
  fetchMatchesUncached,
  ['fetchMatches'],
  { revalidate: 120 }
)

export async function fetchMatchById(id: string) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Match>('matches')
  const row = await repo.findOne({
    where: { id },
    relations: {
      journee: { saison: true },
      equipe_home: true,
      equipe_away: true,
      arbitre: true,
    },
  })
  return toPlain(row)
}

export async function fetchMatchesByJourneeIds(journeeIds: string[]) {
  if (journeeIds.length === 0) {
    return []
  }
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Match>('matches')
  const rows = await repo.find({
    select: ['id', 'journee_id'],
    where: { journee_id: In(journeeIds) },
  })
  return toPlainArray(rows)
}

export async function fetchMatchesByTeam(teamId: string) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Match>('matches')
  const rows = await repo.find({
    where: [
      { equipe_home_id: teamId },
      { equipe_away_id: teamId },
    ],
    relations: {
      journee: { saison: true },
      equipe_home: true,
      equipe_away: true,
      arbitre: true,
    },
    order: { date: 'DESC' },
  })
  return toPlainArray(rows)
}
