import { NextRequest } from 'next/server'
import { getDataSource } from './db'
import { AuditLog, type AuditAction } from './entities'
import { getClientIP } from './utils'
import { getSsoSessionFromRequest } from './ssoSession'

const APP_SOURCE = 'superadmin'

interface LogAdminActionParams {
  request: NextRequest
  action: AuditAction
  entityType: string
  entityId?: string | null
  summary?: string | null
  adminUsername?: string | null
}

/**
 * Enregistre une action administrateur dans le journal d'audit.
 * Ne doit jamais faire échouer l'action elle-même : toute erreur est avalée
 * et journalisée côté serveur uniquement (même logique que les alertes de vote).
 */
export async function logAdminAction({
  request,
  action,
  entityType,
  entityId,
  summary,
  adminUsername,
}: LogAdminActionParams): Promise<void> {
  try {
    const dataSource = await getDataSource()
    const repo = dataSource.getRepository<AuditLog>('audit_logs')
    const session = adminUsername ? null : await getSsoSessionFromRequest(request)
    const entry = repo.create({
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      summary: summary ?? null,
      admin_username: adminUsername ?? session?.email ?? null,
      ip_address: getClientIP(request) !== 'unknown' ? getClientIP(request) : null,
      app_source: APP_SOURCE,
    })
    await repo.save(entry)
  } catch (error) {
    console.error('Failed to write audit log entry:', error)
  }
}
