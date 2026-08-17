import { getDataSource } from './db'
import type { SsoUser } from './ssoSession'

export interface RefereeReplacementReviewRow {
  id: number
  assignmentId: number
  matchId: string
  userId: string
  refereeName: string | null
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESOLVED'
  reviewedBy: string | null
  reviewedAt: Date | null
  reviewNote: string | null
  replacementAssignmentId: number | null
  createdAt: Date
  matchDate: Date | null
  homeName: string | null
  awayName: string | null
  leagueId: string | null
  federationId: string | null
}

function scopeSql(session: SsoUser): { clause: string; params: unknown[] } {
  if (session.role === 'LEAGUE_ADMIN') {
    if (!session.leagueId) return { clause: ' AND 1 = 0', params: [] }
    return { clause: ' AND s.league_id = ?', params: [session.leagueId] }
  }
  if (session.role === 'FEDERATION_ADMIN') {
    if (!session.federationId) return { clause: ' AND 1 = 0', params: [] }
    return { clause: ' AND l.federation_id = ?', params: [session.federationId] }
  }
  return { clause: '', params: [] }
}

function mapRow(row: Record<string, unknown>): RefereeReplacementReviewRow {
  return {
    id: Number(row.id),
    assignmentId: Number(row.assignment_id),
    matchId: String(row.match_id),
    userId: String(row.user_id),
    refereeName: row.referee_name == null ? null : String(row.referee_name),
    reason: String(row.reason),
    status: String(row.status) as RefereeReplacementReviewRow['status'],
    reviewedBy: row.reviewed_by == null ? null : String(row.reviewed_by),
    reviewedAt: row.reviewed_at == null ? null : new Date(String(row.reviewed_at)),
    reviewNote: row.review_note == null ? null : String(row.review_note),
    replacementAssignmentId: row.replacement_assignment_id == null ? null : Number(row.replacement_assignment_id),
    createdAt: new Date(String(row.created_at)),
    matchDate: row.match_date == null ? null : new Date(String(row.match_date)),
    homeName: row.home_name == null ? null : String(row.home_name),
    awayName: row.away_name == null ? null : String(row.away_name),
    leagueId: row.league_id == null ? null : String(row.league_id),
    federationId: row.federation_id == null ? null : String(row.federation_id),
  }
}

export async function listRefereeReplacementRequests(session: SsoUser): Promise<RefereeReplacementReviewRow[]> {
  const ds = await getDataSource()
  const scope = scopeSql(session)
  const rows = await ds.query(
    `SELECT rr.id, rr.assignment_id, rr.match_id, rr.user_id, u.name AS referee_name,
            rr.reason, rr.status, rr.reviewed_by, rr.reviewed_at, rr.review_note,
            rr.replacement_assignment_id, rr.created_at, m.date AS match_date,
            th.name AS home_name, ta.name AS away_name,
            s.league_id, l.federation_id
       FROM referee_replacement_requests rr
       JOIN matches m ON m.id = rr.match_id
       JOIN journees j ON j.id = m.journee_id
       JOIN saisons s ON s.id = j.saison_id
       LEFT JOIN ligues l ON l.id = s.league_id
       LEFT JOIN teams th ON th.id = m.equipe_home
       LEFT JOIN teams ta ON ta.id = m.equipe_away
       LEFT JOIN User u ON u.id = rr.user_id
      WHERE 1 = 1${scope.clause}
      ORDER BY FIELD(rr.status, 'PENDING', 'APPROVED', 'REJECTED', 'RESOLVED'), rr.created_at ASC`,
    scope.params,
  ) as Record<string, unknown>[]
  return rows.map(mapRow)
}

async function assertRequestInScope(session: SsoUser, requestId: number): Promise<RefereeReplacementReviewRow> {
  const rows = await listRefereeReplacementRequests(session)
  const request = rows.find((row) => row.id === requestId)
  if (!request) throw new Error('Demande introuvable dans votre périmètre')
  return request
}

export async function reviewRefereeReplacementRequest(
  session: SsoUser,
  requestId: number,
  decision: 'APPROVED' | 'REJECTED',
  note?: string,
): Promise<void> {
  const current = await assertRequestInScope(session, requestId)
  if (current.status !== 'PENDING') throw new Error('Cette demande a déjà été revue')
  const normalizedNote = note?.trim() || null
  if (decision === 'REJECTED' && (!normalizedNote || normalizedNote.length < 3)) {
    throw new Error('Un motif de rejet est obligatoire')
  }

  const ds = await getDataSource()
  const result = await ds.query(
    `UPDATE referee_replacement_requests
        SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_note = ?
      WHERE id = ? AND status = 'PENDING'`,
    [decision, session.id, normalizedNote, requestId],
  ) as { affectedRows?: number }
  if (!result.affectedRows) throw new Error('La demande a été modifiée par un autre utilisateur')
}

export async function resolveRefereeReplacementRequest(
  session: SsoUser,
  requestId: number,
  replacementAssignmentId: number,
): Promise<void> {
  const current = await assertRequestInScope(session, requestId)
  if (current.status !== 'APPROVED') throw new Error('La demande doit être approuvée avant résolution')
  if (!Number.isSafeInteger(replacementAssignmentId) || replacementAssignmentId <= 0) {
    throw new Error('Identifiant de nouvelle désignation invalide')
  }

  const ds = await getDataSource()
  const assignments = await ds.query(
    `SELECT id FROM match_official_assignments
      WHERE id = ? AND match_id = ? AND status = 'ACTIVE' AND id <> ?
      LIMIT 1`,
    [replacementAssignmentId, current.matchId, current.assignmentId],
  ) as Array<{ id: number }>
  if (assignments.length === 0) {
    throw new Error('La nouvelle désignation doit être ACTIVE, sur le même match et distincte de l’ancienne')
  }

  const result = await ds.query(
    `UPDATE referee_replacement_requests
        SET status = 'RESOLVED', replacement_assignment_id = ?, reviewed_by = ?, reviewed_at = NOW()
      WHERE id = ? AND status = 'APPROVED'`,
    [replacementAssignmentId, session.id, requestId],
  ) as { affectedRows?: number }
  if (!result.affectedRows) throw new Error('La demande a été modifiée par un autre utilisateur')
}
