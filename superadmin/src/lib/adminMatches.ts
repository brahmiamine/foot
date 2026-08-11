import { getDataSource } from './db'
import { Match, Journee } from './entities'
import { toPlain, toPlainArray } from './serialization'
import { notify } from './notificationClient'

export interface MatchCreateInput {
  journee_id: string
  equipe_home: string
  equipe_away: string
  date?: string | null
  score_home?: number | null
  score_away?: number | null
  arbitre_id?: string | null
}

export interface MatchUpdateInput {
  journee_id?: string
  score_home?: number | null
  score_away?: number | null
  date?: string | null
  arbitre_id?: string | null
  equipe_home?: string | null
  equipe_away?: string | null
}

function parseDate(value?: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

function normalizeScore(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export async function listMatchesForAdmin(limit = 50, leagueId?: string | null, journeeId?: string | null) {
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

  if (journeeId) {
    qb.where('match.journee_id = :journeeId', { journeeId })
  } else if (leagueId) {
    qb.where('saison.league_id = :leagueId', { leagueId })
  }

  const rows = await qb.getMany()
  return toPlainArray(rows)
}

export async function fetchJourneesForAdmin(leagueId?: string | null) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Journee>('journees')
  const qb = repo
    .createQueryBuilder('journee')
    .leftJoinAndSelect('journee.saison', 'saison')
    .leftJoinAndSelect('saison.league', 'league')
    .orderBy('league.nom', 'ASC')
    .addOrderBy('saison.nom', 'ASC')
    .addOrderBy('CASE WHEN journee.numero IS NULL THEN 1 ELSE 0 END', 'ASC')
    .addOrderBy('journee.numero', 'ASC')
    .addOrderBy('CASE WHEN journee.nom_fr IS NULL THEN 1 ELSE 0 END', 'ASC')
    .addOrderBy('journee.nom_fr', 'ASC')

  if (leagueId) {
    qb.where('saison.league_id = :leagueId', { leagueId })
  }

  const rows = await qb.getMany()
  return toPlainArray(rows)
}

export async function updateMatchAdmin(id: string, payload: MatchUpdateInput, leagueId?: string | null) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Match>('matches')
  const match = await repo.findOne({
    where: { id },
    relations: {
      equipe_home: true,
      equipe_away: true,
      journee: { saison: true },
      arbitre: true,
    },
  })

  if (!match) {
    throw new Error('Match introuvable')
  }

  // Vérifier la nouvelle journée si elle est modifiée
  if (payload.journee_id !== undefined && payload.journee_id !== match.journee_id) {
    const journeeRepo = dataSource.getRepository('journees')
    const newJournee = await journeeRepo.findOne({
      where: { id: payload.journee_id },
    })

    if (!newJournee) {
      throw new Error('Journée introuvable')
    }
  }

  // Construire l'objet de mise à jour
  const updateData: Partial<Match> = {}
  
  if (payload.journee_id !== undefined) {
    updateData.journee_id = payload.journee_id
  }
  
  if (payload.score_home !== undefined) {
    updateData.score_home = normalizeScore(payload.score_home)
  }
  if (payload.score_away !== undefined) {
    updateData.score_away = normalizeScore(payload.score_away)
  }
  if (payload.date !== undefined) {
    updateData.date = parseDate(payload.date)
  }
  // Toujours mettre à jour arbitre_id si présent dans le payload
  if (payload.arbitre_id !== undefined) {
    // Permettre de définir arbitre_id à null pour supprimer l'arbitre
    updateData.arbitre_id = payload.arbitre_id === null || payload.arbitre_id === '' ? null : payload.arbitre_id
  }
  // Mettre à jour les équipes
  if (payload.equipe_home !== undefined) {
    updateData.equipe_home_id = payload.equipe_home === null || payload.equipe_home === '' ? undefined : payload.equipe_home
  }
  if (payload.equipe_away !== undefined) {
    updateData.equipe_away_id = payload.equipe_away === null || payload.equipe_away === '' ? undefined : payload.equipe_away
  }

  // Mettre à jour directement dans la base de données
  if (Object.keys(updateData).length > 0) {
    await repo.update(id, updateData)
  }

  // Recharger avec les relations pour retourner les données complètes
  const updated = await repo.findOne({
    where: { id },
    relations: {
      equipe_home: true,
      equipe_away: true,
      journee: { saison: true },
      arbitre: true,
    },
  })

  if (!updated) {
    throw new Error('Match introuvable après mise à jour')
  }

  const oldTime = match.date ? new Date(match.date).getTime() : null
  const newTime = updated.date ? new Date(updated.date).getTime() : null
  if (payload.date !== undefined && oldTime !== newTime) {
    await notifyMatchEvent(updated, 'MATCH_RESCHEDULED')
  }

  return toPlain(updated)
}

/**
 * Notifie les deux clubs (staff ADMIN/OBSERVATEUR via notification-api)
 * qu'un match a été créé ou reprogrammé. N'échoue jamais l'opération
 * d'origine : une erreur ici est journalisée et avalée par notificationClient.
 */
async function notifyMatchEvent(match: Match, type: 'MATCH_CREATED' | 'MATCH_RESCHEDULED') {
  const matchName = `${match.equipe_home?.nom ?? '?'} - ${match.equipe_away?.nom ?? '?'}`
  const matchDate = match.date ? new Date(match.date).toISOString() : null
  const data = { matchId: match.id, matchName, matchDate }
  const title = type === 'MATCH_CREATED' ? 'Nouveau match programmé' : "Changement d'horaire"
  const body =
    type === 'MATCH_CREATED'
      ? `Un nouveau match a été programmé : ${matchName}.`
      : `L'horaire de ${matchName} a changé.`

  for (const [side, teamId] of [
    ['home', match.equipe_home_id],
    ['away', match.equipe_away_id],
  ] as const) {
    await notify({
      eventId: `${type.toLowerCase()}:${match.id}:${side}:${matchDate ?? 'no-date'}`,
      type,
      target: { type: 'TEAM', teamId },
      teamId,
      category: type,
      title,
      body,
      data,
    })
  }
}

export async function createMatchAdmin(payload: MatchCreateInput, leagueId?: string | null) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Match>('matches')
  const journeeRepo = dataSource.getRepository('journees')
  const teamRepo = dataSource.getRepository('teams')
  const arbitreRepo = dataSource.getRepository('arbitres')

  // Vérifier que la journée existe
  const journee = await journeeRepo.findOne({
    where: { id: payload.journee_id },
  })

  if (!journee) {
    throw new Error('Journée introuvable')
  }

  // Vérifier que les équipes existent
  const [equipeHome, equipeAway] = await Promise.all([
    teamRepo.findOne({ where: { id: payload.equipe_home } }),
    teamRepo.findOne({ where: { id: payload.equipe_away } }),
  ])

  if (!equipeHome) {
    throw new Error('Équipe à domicile introuvable')
  }

  if (!equipeAway) {
    throw new Error('Équipe à l\'extérieur introuvable')
  }

  if (payload.equipe_home === payload.equipe_away) {
    throw new Error('Les deux équipes doivent être différentes')
  }

  // Vérifier l'arbitre si fourni
  if (payload.arbitre_id) {
    const arbitre = await arbitreRepo.findOne({ where: { id: payload.arbitre_id } })
    if (!arbitre) {
      throw new Error('Arbitre introuvable')
    }
  }

  // Créer le nouveau match
  const newMatch = repo.create({
    journee_id: payload.journee_id,
    equipe_home_id: payload.equipe_home,
    equipe_away_id: payload.equipe_away,
    date: parseDate(payload.date),
    score_home: normalizeScore(payload.score_home),
    score_away: normalizeScore(payload.score_away),
    arbitre_id: payload.arbitre_id || null,
  })

  const saved = await repo.save(newMatch)

  // Recharger avec les relations
  const match = await repo.findOne({
    where: { id: saved.id },
    relations: {
      equipe_home: true,
      equipe_away: true,
      journee: { saison: true },
      arbitre: true,
    },
  })

  if (!match) {
    throw new Error('Erreur lors de la création du match')
  }

  await notifyMatchEvent(match, 'MATCH_CREATED')

  return toPlain(match)
}

export async function deleteMatchAdmin(id: string, leagueId?: string | null) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Match>('matches')
  
  const match = await repo.findOne({
    where: { id },
    relations: {
      journee: { saison: true },
    },
  })

  if (!match) {
    throw new Error('Match introuvable')
  }

  // Vérifier s'il y a des votes associés
  const voteRepo = dataSource.getRepository('votes')
  const votesCount = await voteRepo.count({
    where: { match_id: id },
  })

  if (votesCount > 0) {
    throw new Error(`Impossible de supprimer ce match car il contient ${votesCount} vote(s)`)
  }

  await repo.delete(id)
  return { success: true }
}


