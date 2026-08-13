import { getDataSource } from './db'
import { Match, Journee, Sheet } from './entities'
import { toPlain, toPlainArray } from './serialization'
import { notify } from './notificationClient'
import { reopenSheet } from './matchsheetClient'
import { assertSeasonDateCoherence, findScheduleConflicts, ScheduleConflict, ScheduleConflictError } from './scheduleConflicts'
import { withScheduleLock } from './scheduleLock'

export interface MatchCreateInput {
  journee_id: string
  equipe_home: string
  equipe_away: string
  date?: string | null
  score_home?: number | null
  score_away?: number | null
  arbitre_id?: string | null
  /** Motif obligatoire pour passer outre un conflit de programmation détecté (§TASK-P0-008). */
  derogation_reason?: string | null
}

export interface MatchUpdateInput {
  journee_id?: string
  score_home?: number | null
  score_away?: number | null
  date?: string | null
  arbitre_id?: string | null
  equipe_home?: string | null
  equipe_away?: string | null
  derogation_reason?: string | null
}

export interface MatchMutationResult {
  match: ReturnType<typeof toPlain<Match>>
  /** Conflits détectés et volontairement outrepassés via `derogation_reason` — à consigner à l'audit par l'appelant. */
  overriddenConflicts: ScheduleConflict[]
}

const MIN_DEROGATION_REASON_LENGTH = 10

function requireDerogationReason(reason: string | null | undefined, conflicts: ScheduleConflict[]): void {
  if (!reason || reason.trim().length < MIN_DEROGATION_REASON_LENGTH) {
    throw new ScheduleConflictError(conflicts)
  }
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

export async function updateMatchAdmin(
  id: string,
  payload: MatchUpdateInput,
  leagueId?: string | null,
): Promise<MatchMutationResult> {
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

  const newEquipeHomeId =
    payload.equipe_home !== undefined && payload.equipe_home ? payload.equipe_home : match.equipe_home_id
  const newEquipeAwayId =
    payload.equipe_away !== undefined && payload.equipe_away ? payload.equipe_away : match.equipe_away_id
  const teamsChanged = newEquipeHomeId !== match.equipe_home_id || newEquipeAwayId !== match.equipe_away_id

  // Une fois la feuille de match préparée/signée, changer les équipes fausserait
  // convocations/effectifs déjà engagés côté matchsheet — aucune procédure de
  // correction outillée ici (voir TASK-P0-009), donc on bloque sans dérogation
  // possible plutôt que de laisser un état incohérent entre superadmin et
  // matchsheet (§TASK-P0-008).
  if (teamsChanged) {
    const sheetRepo = dataSource.getRepository(Sheet)
    const sheet = await sheetRepo.findOne({ where: { matchId: id } })
    if (sheet && sheet.status !== 'DRAFT') {
      throw new Error(
        `Impossible de modifier les équipes : la feuille de match est déjà préparée/signée (statut ${sheet.status}). Passez par une procédure de correction dédiée.`,
      )
    }
  }

  const scheduleRelevant =
    payload.journee_id !== undefined ||
    payload.date !== undefined ||
    payload.arbitre_id !== undefined ||
    payload.equipe_home !== undefined ||
    payload.equipe_away !== undefined

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

  let overriddenConflicts: ScheduleConflict[] = []

  // Vérification des conflits ET écriture sous le même verrou : sinon deux
  // modifications concurrentes pourraient toutes deux passer la vérification
  // avant que l'une n'écrive (§TASK-P0-008, "deux requêtes concurrentes").
  if (scheduleRelevant) {
    const newDate = payload.date !== undefined ? parseDate(payload.date) : (match.date ?? null)
    const newArbitreId =
      payload.arbitre_id !== undefined ? (payload.arbitre_id || null) : (match.arbitre_id ?? null)
    const newJourneeId = payload.journee_id !== undefined ? payload.journee_id : match.journee_id

    const lockKeys = [newEquipeHomeId, newEquipeAwayId, newArbitreId].filter((v): v is string => !!v)
    overriddenConflicts = await withScheduleLock(lockKeys, async () => {
      await assertSeasonDateCoherence(dataSource, newJourneeId, newDate)

      const conflicts = await findScheduleConflicts(dataSource, {
        date: newDate,
        equipeHomeId: newEquipeHomeId,
        equipeAwayId: newEquipeAwayId,
        arbitreId: newArbitreId,
        excludeMatchId: id,
      })
      if (conflicts.length > 0) {
        requireDerogationReason(payload.derogation_reason, conflicts)
      }

      if (Object.keys(updateData).length > 0) {
        await repo.update(id, updateData)
      }
      return conflicts
    })
  } else if (Object.keys(updateData).length > 0) {
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

  return { match: toPlain(updated), overriddenConflicts }
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

export async function createMatchAdmin(
  payload: MatchCreateInput,
  leagueId?: string | null,
): Promise<MatchMutationResult> {
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

  const newDate = parseDate(payload.date)
  const lockKeys = [payload.equipe_home, payload.equipe_away, payload.arbitre_id].filter(
    (v): v is string => !!v,
  )

  // Vérification des conflits ET insertion sous le même verrou : sinon deux
  // créations concurrentes pourraient toutes deux passer la vérification
  // avant que l'une n'insère (§TASK-P0-008, "deux requêtes concurrentes").
  const { saved, overriddenConflicts } = await withScheduleLock(lockKeys, async () => {
    await assertSeasonDateCoherence(dataSource, payload.journee_id, newDate)

    const conflicts = await findScheduleConflicts(dataSource, {
      date: newDate,
      equipeHomeId: payload.equipe_home,
      equipeAwayId: payload.equipe_away,
      arbitreId: payload.arbitre_id ?? null,
    })
    if (conflicts.length > 0) {
      requireDerogationReason(payload.derogation_reason, conflicts)
    }

    // Créer le nouveau match
    const newMatch = repo.create({
      journee_id: payload.journee_id,
      equipe_home_id: payload.equipe_home,
      equipe_away_id: payload.equipe_away,
      date: newDate,
      score_home: normalizeScore(payload.score_home),
      score_away: normalizeScore(payload.score_away),
      arbitre_id: payload.arbitre_id || null,
    })

    return { saved: await repo.save(newMatch), overriddenConflicts: conflicts }
  })

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

  return { match: toPlain(match), overriddenConflicts }
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

/**
 * Annule un match (matches.status -> CANCELLED). Restreint aux matchs
 * UPCOMING : annuler un match déjà IN_PROGRESS/FINISHED n'a pas de sens
 * (le coup d'envoi a eu lieu), et un match déjà CANCELLED n'a pas besoin
 * d'être réannulé — pas de réactivation possible depuis cette action
 * (décision produit à part si le besoin se confirme, voir avancement.md).
 * `matchsheet` ne mirrorera plus jamais IN_PROGRESS/FINISHED par-dessus un
 * match CANCELLED (voir SheetService.mirrorMatchStatus).
 */
export async function cancelMatchAdmin(id: string, reason: string) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Match>('matches')

  const match = await repo.findOne({
    where: { id },
    relations: { equipe_home: true, equipe_away: true },
  })
  if (!match) {
    throw new Error('Match introuvable')
  }
  if (match.status !== 'UPCOMING') {
    throw new Error(`Impossible d'annuler un match au statut ${match.status}`)
  }

  await repo.update(id, { status: 'CANCELLED' })

  const matchName = `${match.equipe_home?.nom ?? '?'} - ${match.equipe_away?.nom ?? '?'}`
  const data = { matchId: match.id, matchName, reason }
  for (const [side, teamId] of [
    ['home', match.equipe_home_id],
    ['away', match.equipe_away_id],
  ] as const) {
    await notify({
      eventId: `match_cancelled:${match.id}:${side}`,
      type: 'MATCH_CANCELLED',
      target: { type: 'TEAM', teamId },
      teamId,
      category: 'MATCH_CANCELLED',
      title: 'Match annulé',
      body: `Le match ${matchName} a été annulé. Motif : ${reason}`,
      data,
    })
  }

  return { success: true }
}

/**
 * Rouvre un match FINISHED (matches.status -> IN_PROGRESS) avec motif
 * obligatoire et trace d'audit — voir avancement.md : jusqu'ici, corriger
 * une feuille après clôture était une opération technique directe en base,
 * jamais un processus métier approuvé.
 *
 * TS-31 (avancement.md) : SUPERADMIN n'a pas accès à `matchsheet` en tant
 * qu'utilisateur (choix produit assumé), mais n'écrit plus directement dans
 * `ms_sheets`/`matches` pour autant — la transition (sheet -> IN_PROGRESS,
 * closed_at effacé, match -> IN_PROGRESS, actual_finished_at effacé) est
 * désormais pilotée par matchsheet lui-même via un appel HTTP authentifié
 * (voir matchsheetClient.ts, POST /api/internal/matches/:id/reopen) —
 * remplace l'ancien accès direct TypeORM à `ms_sheets`, table propriété de
 * `matchsheet`. La lecture de `sheet.status` ci-dessous reste locale
 * (préchargée pour un message d'erreur clair sans aller-retour réseau
 * inutile quand la condition est déjà visiblement fausse) — seule
 * l'écriture change de propriétaire, matchsheet revalide de toute façon
 * l'état de la feuille avant d'agir. Restreinte aux matchs FINISHED avec
 * une feuille CLOSED : un match CANCELLED ne se rouvre pas depuis cette
 * action (décision produit distincte), et un match qui n'a jamais été
 * clôturé n'a rien à rouvrir.
 */
export async function reopenMatchAdmin(id: string, reason: string) {
  const dataSource = await getDataSource()
  const matchRepo = dataSource.getRepository<Match>('matches')
  const sheetRepo = dataSource.getRepository(Sheet)

  const match = await matchRepo.findOne({
    where: { id },
    relations: { equipe_home: true, equipe_away: true },
  })
  if (!match) {
    throw new Error('Match introuvable')
  }
  if (match.status !== 'FINISHED') {
    throw new Error(`Impossible de rouvrir un match au statut ${match.status} (seul un match Terminé peut être rouvert)`)
  }

  const sheet = await sheetRepo.findOne({ where: { matchId: id } })
  if (!sheet || sheet.status !== 'CLOSED') {
    throw new Error("Aucune feuille de match clôturée à rouvrir pour ce match")
  }

  await reopenSheet(id)

  const matchName = `${match.equipe_home?.nom ?? '?'} - ${match.equipe_away?.nom ?? '?'}`
  const data = { matchId: match.id, matchName, reason }
  for (const [side, teamId] of [
    ['home', match.equipe_home_id],
    ['away', match.equipe_away_id],
  ] as const) {
    await notify({
      eventId: `match_reopened:${match.id}:${side}:${Date.now()}`,
      type: 'MATCH_REOPENED',
      target: { type: 'TEAM', teamId },
      teamId,
      category: 'MATCH_REOPENED',
      title: 'Match rouvert',
      body: `La feuille du match ${matchName} a été rouverte pour correction. Motif : ${reason}`,
      data,
    })
  }

  return { success: true }
}


