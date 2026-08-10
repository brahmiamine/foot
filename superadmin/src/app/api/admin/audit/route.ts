import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { safeErrorMessage } from '@/lib/apiError'
import { getDataSource } from '@/lib/db'
import { AuditLog, TeamManagerAuditLog, User } from '@/lib/entities'

export const runtime = 'nodejs'

interface UnifiedLogEntry {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  summary: string | null
  admin_username: string | null
  ip_address: string | null
  app_source: string | null
  created_at: string
}

/**
 * GET /api/admin/audit
 * Journal d'audit unifié : fusionne `audit_logs` (arbinote/superadmin/
 * matchsheet) et `AuditLog` (teamManager, schéma différent — voir
 * TeamManagerAuditLog) en une seule liste triée par date. Les deux
 * journaux existaient avant sans jamais être croisés : impossible de voir
 * "qui a fait quoi" sur toute la plateforme depuis un seul écran.
 *
 * Pagination approximative par nécessité : on ne peut pas faire un simple
 * OFFSET/LIMIT SQL sur deux tables distinctes. On récupère les N entrées
 * les plus récentes de CHAQUE source (N = offset + limit, plafonné), on
 * fusionne et trie en mémoire, puis on découpe la page demandée — correct
 * tant que la profondeur demandée reste sous le plafond.
 */
export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 25))
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0)
    const entityType = searchParams.get('entityType') || undefined
    const action = searchParams.get('action') || undefined
    const fetchDepth = Math.min(500, offset + limit)

    const dataSource = await getDataSource()

    const auditLogsRepo = dataSource.getRepository<AuditLog>('audit_logs')
    const auditLogsQb = auditLogsRepo.createQueryBuilder('log').orderBy('log.created_at', 'DESC').take(fetchDepth)
    if (entityType) auditLogsQb.andWhere('log.entity_type = :entityType', { entityType })
    if (action) auditLogsQb.andWhere('log.action = :action', { action })
    const auditLogsTotal = await auditLogsQb.getCount()
    const auditLogsRows = await auditLogsQb.getMany()

    const tmRepo = dataSource.getRepository(TeamManagerAuditLog)
    const tmQb = tmRepo.createQueryBuilder('log').orderBy('log.createdAt', 'DESC').take(fetchDepth)
    if (entityType) tmQb.andWhere('log.entity = :entityType', { entityType })
    if (action) tmQb.andWhere('log.action = :action', { action: action.toUpperCase() })
    const tmTotal = await tmQb.getCount()
    const tmRows = await tmQb.getMany()

    const userIds = [...new Set(tmRows.map((row) => row.userId))]
    const users = userIds.length
      ? await dataSource.getRepository(User).find({ where: userIds.map((id) => ({ id })) })
      : []
    const emailById = new Map(users.map((user) => [user.id, user.email]))

    const normalizedAuditLogs: UnifiedLogEntry[] = auditLogsRows.map((row) => ({
      id: row.id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id ?? null,
      summary: row.summary ?? null,
      admin_username: row.admin_username ?? null,
      ip_address: row.ip_address ?? null,
      app_source: row.app_source ?? null,
      created_at: row.created_at.toISOString(),
    }))

    const normalizedTeamManager: UnifiedLogEntry[] = tmRows.map((row) => ({
      id: row.id,
      action: row.action.toLowerCase(),
      entity_type: row.entity,
      entity_id: row.entityId,
      summary: null,
      admin_username: emailById.get(row.userId) ?? row.userId,
      ip_address: null,
      app_source: 'teamManager',
      created_at: row.createdAt.toISOString(),
    }))

    const merged = [...normalizedAuditLogs, ...normalizedTeamManager]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit)

    return NextResponse.json({ logs: merged, total: auditLogsTotal + tmTotal })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 500 }
    )
  }
}
