import { NextRequest } from 'next/server'
import { getDataSource } from './db'
import { AuditLog, type AuditAction } from './entities'
import { getClientIP } from './utils'

interface LogAdminActionParams {
  request: NextRequest
  action: AuditAction
  entityType: string
  entityId?: string | null
  summary?: string | null
  adminUsername?: string | null
}

function getAdminUsername(request: NextRequest): string | null {
  // Le token contient "username:password" en base64 (voir adminAuth.ts) : on
  // récupère uniquement le nom d'utilisateur pour l'attribution du journal.
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Basic ')
    ? header.slice(6)
    : request.cookies.get('admin-token')?.value ?? null
  if (!token) return null
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    return decoded.split(':')[0] || null
  } catch {
    return null
  }
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
    const entry = repo.create({
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      summary: summary ?? null,
      admin_username: adminUsername ?? getAdminUsername(request),
      ip_address: getClientIP(request) !== 'unknown' ? getClientIP(request) : null,
    })
    await repo.save(entry)
  } catch (error) {
    console.error('Failed to write audit log entry:', error)
  }
}
