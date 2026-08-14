import { In } from 'typeorm'
import { unstable_cache } from 'next/cache'
import { getDataSource } from '../db'
import { Journee, Match } from '../entities'
import { toPlain, toPlainArray } from '../serialization'

async function fetchJourneesBySaisonUncached(saisonId: string) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Journee>('journees')
  const qb = repo
    .createQueryBuilder('journee')
    .select([
      'journee.id',
      'journee.numero',
      'journee.nom_fr',
      'journee.nom_en',
      'journee.nom_ar',
      'journee.saison_id',
      'journee.date_journee',
    ])
    .where('journee.saison_id = :saisonId', { saisonId })
    .orderBy('CASE WHEN journee.numero IS NULL THEN 1 ELSE 0 END', 'ASC')
    .addOrderBy('journee.numero', 'ASC')
    .addOrderBy('CASE WHEN journee.nom_fr IS NULL THEN 1 ELSE 0 END', 'ASC')
    .addOrderBy('journee.nom_fr', 'ASC')

  const rows = await qb.getMany()
  return toPlainArray(rows)
}

export const fetchJourneesBySaison = unstable_cache(
  fetchJourneesBySaisonUncached,
  ['fetchJourneesBySaison'],
  { revalidate: 120 }
)

export async function fetchJourneeWithSeason(id: string) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Journee>('journees')
  const row = await repo.findOne({
    where: { id },
    relations: {
      saison: true,
    },
  })
  return toPlain(row)
}

export async function fetchNextJourneeMatches(referenceDate: Date = new Date(), leagueId?: string | null) {
  const dataSource = await getDataSource()
  const journeeRepo = dataSource.getRepository<Journee>('journees')
  const matchRepo = dataSource.getRepository<Match>('matches')
  const today = referenceDate.toISOString().slice(0, 10)

  const baseQuery = journeeRepo
    .createQueryBuilder('j')
    .leftJoinAndSelect('j.saison', 'saison')

  if (leagueId) {
    baseQuery.where('saison.league_id = :leagueId', { leagueId })
  }

  const nextJournee =
    (await baseQuery
      .clone()
      .andWhere('j.date_journee IS NOT NULL')
      .andWhere('j.date_journee >= :today', { today })
      .orderBy('j.date_journee', 'ASC')
      .getOne()) ||
    (await baseQuery.clone().orderBy('j.date_journee', 'DESC').getOne())

  if (!nextJournee) {
    return null
  }

  const matches = await matchRepo.find({
    where: { journee_id: nextJournee.id },
    relations: {
      journee: true,
      equipe_home: true,
      equipe_away: true,
      arbitre: true,
    },
    order: { date: 'ASC' },
  })

  return {
    journee: toPlain(nextJournee),
    matches: toPlainArray(matches),
  }
}

export async function fetchUpcomingMatches(referenceDate: Date = new Date(), leagueId?: string | null) {
  const dataSource = await getDataSource()
  const matchRepo = dataSource.getRepository<Match>('matches')
  const journeeRepo = dataSource.getRepository<Journee>('journees')
  const today = referenceDate.toISOString().slice(0, 10)

  // Récupérer toutes les journées à venir
  const baseJourneeQuery = journeeRepo
    .createQueryBuilder('j')
    .leftJoinAndSelect('j.saison', 'saison')
    .where('j.date_journee IS NOT NULL')
    .andWhere('j.date_journee >= :today', { today })
    .orderBy('j.date_journee', 'ASC')

  if (leagueId) {
    baseJourneeQuery.andWhere('saison.league_id = :leagueId', { leagueId })
  }

  const upcomingJournees = await baseJourneeQuery.getMany()

  if (upcomingJournees.length === 0) {
    return []
  }

  const journeeIds = upcomingJournees.map(j => j.id)

  // Récupérer tous les matchs de ces journées (sans condition sur la date du match)
  const qb = matchRepo
    .createQueryBuilder('match')
    .leftJoinAndSelect('match.journee', 'journee')
    .leftJoinAndSelect('journee.saison', 'saison')
    .leftJoinAndSelect('match.equipe_home', 'equipe_home')
    .leftJoinAndSelect('match.equipe_away', 'equipe_away')
    .leftJoinAndSelect('match.arbitre', 'arbitre')
    .where('match.journee_id IN (:...journeeIds)', { journeeIds })
    .orderBy('match.date', 'ASC')
    .addOrderBy('match.created_at', 'ASC')

  const matches = await qb.getMany()
  return toPlainArray(matches)
}

export async function fetchNextJourneeAllMatches(referenceDate: Date = new Date(), leagueId?: string | null) {
  const dataSource = await getDataSource()
  const journeeRepo = dataSource.getRepository<Journee>('journees')
  const matchRepo = dataSource.getRepository<Match>('matches')
  const today = referenceDate.toISOString().slice(0, 10)

  // Si aucune ligue spécifiée, récupérer toutes les journées à venir de toutes les ligues
  if (!leagueId) {
    // Trouver toutes les journées à venir de toutes les ligues
    const allUpcomingJournees = await journeeRepo
      .createQueryBuilder('j')
      .leftJoinAndSelect('j.saison', 'saison')
      .where('j.date_journee IS NOT NULL')
      .andWhere('j.date_journee >= :today', { today })
      .orderBy('j.date_journee', 'ASC')
      .getMany()

    if (allUpcomingJournees.length === 0) {
      // Si aucune journée à venir, prendre les dernières journées
      const latestJournees = await journeeRepo
        .createQueryBuilder('j')
        .leftJoinAndSelect('j.saison', 'saison')
        .where('j.date_journee IS NOT NULL')
        .orderBy('j.date_journee', 'DESC')
        .addOrderBy('j.created_at', 'DESC')
        .getMany()

      if (latestJournees.length === 0) {
        return []
      }

      // Grouper par date_journee et prendre toutes les journées de la date la plus récente
      const journeesByDate = new Map<string, Journee[]>()
      for (const journee of latestJournees) {
        if (journee.date_journee) {
          const dateKey = journee.date_journee.toISOString().slice(0, 10)
          const existing = journeesByDate.get(dateKey) || []
          existing.push(journee)
          journeesByDate.set(dateKey, existing)
        }
      }

      const sortedDates = Array.from(journeesByDate.keys()).sort().reverse()
      if (sortedDates.length === 0) {
        return []
      }

      const latestDate = sortedDates[0]
      const targetJournees = journeesByDate.get(latestDate) || []
      const journeeIds = targetJournees.map(j => j.id)

      const allMatches = await matchRepo.find({
        where: { journee_id: In(journeeIds) },
        relations: {
          journee: true,
          equipe_home: true,
          equipe_away: true,
          arbitre: true,
        },
        order: { date: 'ASC' },
      })

      return toPlainArray(allMatches)
    }

    // Grouper les journées par date_journee pour trouver toutes les journées de la date la plus proche
    const journeesByDate = new Map<string, Journee[]>()
    for (const journee of allUpcomingJournees) {
      if (journee.date_journee) {
        const dateKey = journee.date_journee.toISOString().slice(0, 10)
        const existing = journeesByDate.get(dateKey) || []
        existing.push(journee)
        journeesByDate.set(dateKey, existing)
      }
    }

    // Prendre toutes les journées de la date la plus proche
    const sortedDates = Array.from(journeesByDate.keys()).sort()
    if (sortedDates.length === 0) {
      return []
    }

    const closestDate = sortedDates[0]
    const targetJournees = journeesByDate.get(closestDate) || []
    const journeeIds = targetJournees.map(j => j.id)

    // Récupérer tous les matchs de toutes ces journées
    const allMatches = await matchRepo.find({
      where: { journee_id: In(journeeIds) },
      relations: {
        journee: true,
        equipe_home: true,
        equipe_away: true,
        arbitre: true,
      },
      order: { date: 'ASC' },
    })

    return toPlainArray(allMatches)
  }

  // Logique pour une ligue spécifique (identique à fetchNextJourneeMatches)
  const baseQuery = journeeRepo
    .createQueryBuilder('j')
    .leftJoinAndSelect('j.saison', 'saison')
    .where('saison.league_id = :leagueId', { leagueId })

  // Trouver la prochaine journée (ou la dernière si aucune à venir)
  const nextJournee =
    (await baseQuery
      .clone()
      .andWhere('j.date_journee IS NOT NULL')
      .andWhere('j.date_journee >= :today', { today })
      .orderBy('j.date_journee', 'ASC')
      .getOne()) ||
    (await baseQuery.clone().orderBy('j.date_journee', 'DESC').getOne())

  if (!nextJournee) {
    return []
  }

  // Récupérer TOUS les matchs de cette journée, sans condition sur la date du match
  const matches = await matchRepo.find({
    where: { journee_id: nextJournee.id },
    relations: {
      journee: true,
      equipe_home: true,
      equipe_away: true,
      arbitre: true,
    },
    order: { date: 'ASC' },
  })

  return toPlainArray(matches)
}

export async function fetchCurrentAndPreviousJournees(leagueId?: string | null) {
  const dataSource = await getDataSource()
  const journeeRepo = dataSource.getRepository<Journee>('journees')
  const today = new Date().toISOString().slice(0, 10)

  const baseQuery = journeeRepo
    .createQueryBuilder('j')
    .leftJoinAndSelect('j.saison', 'saison')
    .where('j.date_journee IS NOT NULL')

  if (leagueId) {
    baseQuery.andWhere('saison.league_id = :leagueId', { leagueId })
  }

  // Récupérer la journée courante (date_journee >= aujourd'hui, la plus proche)
  const currentJournee = await baseQuery
    .clone()
    .andWhere('j.date_journee >= :today', { today })
    .orderBy('j.date_journee', 'ASC')
    .addOrderBy('j.numero', 'ASC')
    .getOne()

  // Récupérer la journée précédente (date_journee < aujourd'hui, la plus récente)
  const previousJournee = await baseQuery
    .clone()
    .andWhere('j.date_journee < :today', { today })
    .orderBy('j.date_journee', 'DESC')
    .addOrderBy('j.numero', 'DESC')
    .getOne()

  return {
    current: currentJournee ? toPlain(currentJournee) : null,
    previous: previousJournee ? toPlain(previousJournee) : null,
  }
}
