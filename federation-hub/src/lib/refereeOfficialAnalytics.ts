import { getDataSource } from './db'
import { Journee, League, Match, RefereeOfficialEvaluation, Saison, Vote } from './entities'

export interface RefereeOfficialTrendPoint {
  evaluationId: string
  matchId: string
  date: string
  note: number
  observerUserId: string
}

export interface RefereeObserverComparison {
  observerUserId: string
  evaluationCount: number
  averageNote: number
}

export interface RefereeOfficialAnalytics {
  evaluationCount: number
  averageNoteOfficielle: number | null
  trend: RefereeOfficialTrendPoint[]
  byObserver: RefereeObserverComparison[]
  public: {
    voteCount: number
    averagePublicScore: number | null
  }
}

export async function getRefereeOfficialAnalytics(
  arbitreId: string,
  scope: { federationId?: string | null; leagueId?: string | null; observerUserId?: string | null } = {},
): Promise<RefereeOfficialAnalytics> {
  const dataSource = await getDataSource()
  const officialQb = dataSource.getRepository(RefereeOfficialEvaluation)
    .createQueryBuilder('evaluation')
    .where('evaluation.arbitre_id = :arbitreId', { arbitreId })
    .andWhere('evaluation.status = :status', { status: 'VALIDATED' })
    .orderBy('evaluation.validated_at', 'ASC')
    .addOrderBy('evaluation.created_at', 'ASC')
  if (scope.federationId) officialQb.andWhere('evaluation.federation_id = :federationId', { federationId: scope.federationId })
  if (scope.leagueId) officialQb.andWhere('evaluation.league_id = :leagueId', { leagueId: scope.leagueId })
  if (scope.observerUserId) officialQb.andWhere('evaluation.observer_user_id = :observerUserId', { observerUserId: scope.observerUserId })
  const evaluations = await officialQb.getMany()

  const publicQb = dataSource.getRepository(Vote)
    .createQueryBuilder('vote')
    .innerJoin(Match, 'match', 'match.id = vote.match_id')
    .innerJoin(Journee, 'journee', 'journee.id = match.journee_id')
    .innerJoin(Saison, 'saison', 'saison.id = journee.saison_id')
    .innerJoin(League, 'league', 'league.id = saison.league_id')
    .where('vote.arbitre_id = :arbitreId', { arbitreId })
    .andWhere('(vote.moderation_status IS NULL OR vote.moderation_status != :excluded)', { excluded: 'excluded' })
  if (scope.federationId) publicQb.andWhere('league.federation_id = :federationId', { federationId: scope.federationId })
  if (scope.leagueId) publicQb.andWhere('league.id = :leagueId', { leagueId: scope.leagueId })
  const publicVotes = await publicQb.getMany()
  const publicNotes = publicVotes.map((vote) => Number(vote.note_globale))
  const publicStats = {
    voteCount: publicVotes.length,
    averagePublicScore: publicNotes.length
      ? Math.round((publicNotes.reduce((sum, note) => sum + note, 0) / publicNotes.length) * 100) / 100
      : null,
  }

  if (!evaluations.length) {
    return { evaluationCount: 0, averageNoteOfficielle: null, trend: [], byObserver: [], public: publicStats }
  }

  const notes = evaluations.map((evaluation) => Number(evaluation.note_officielle))
  const average = Math.round((notes.reduce((sum, note) => sum + note, 0) / notes.length) * 100) / 100
  const trend = evaluations.map((evaluation) => ({
    evaluationId: evaluation.id,
    matchId: evaluation.match_id,
    date: evaluation.validated_at?.toISOString() ?? evaluation.created_at?.toISOString() ?? '',
    note: Number(evaluation.note_officielle),
    observerUserId: evaluation.observer_user_id,
  }))

  const grouped = new Map<string, number[]>()
  for (const evaluation of evaluations) {
    const current = grouped.get(evaluation.observer_user_id) ?? []
    current.push(Number(evaluation.note_officielle))
    grouped.set(evaluation.observer_user_id, current)
  }

  const byObserver = [...grouped.entries()]
    .map(([observerUserId, observerNotes]) => ({
      observerUserId,
      evaluationCount: observerNotes.length,
      averageNote: Math.round((observerNotes.reduce((sum, note) => sum + note, 0) / observerNotes.length) * 100) / 100,
    }))
    .sort((a, b) => b.evaluationCount - a.evaluationCount || b.averageNote - a.averageNote)

  return { evaluationCount: evaluations.length, averageNoteOfficielle: average, trend, byObserver, public: publicStats }
}
