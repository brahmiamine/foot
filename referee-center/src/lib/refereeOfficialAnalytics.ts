import { getDataSource } from './db'
import { RefereeOfficialEvaluation } from './entities'

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
}

export async function getRefereeOfficialAnalytics(arbitreId: string): Promise<RefereeOfficialAnalytics> {
  const dataSource = await getDataSource()
  const evaluations = await dataSource.getRepository(RefereeOfficialEvaluation).find({
    where: { arbitre_id: arbitreId, status: 'VALIDATED' },
    order: { validated_at: 'ASC', created_at: 'ASC' },
  })

  if (!evaluations.length) {
    return { evaluationCount: 0, averageNoteOfficielle: null, trend: [], byObserver: [] }
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

  return { evaluationCount: evaluations.length, averageNoteOfficielle: average, trend, byObserver }
}
