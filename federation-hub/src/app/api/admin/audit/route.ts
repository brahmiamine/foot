import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { safeErrorMessage } from '@/lib/apiError'
import { getDataSource } from '@/lib/db'
import { AuditLog } from '@/lib/entities'
import { toPlainArray } from '@/lib/serialization'

export const runtime = 'nodejs'

/**
 * GET /api/admin/audit
 * Liste paginée du journal d'audit administrateur.
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

    const dataSource = await getDataSource()
    const repo = dataSource.getRepository<AuditLog>('audit_logs')

    const qb = repo.createQueryBuilder('log').orderBy('log.created_at', 'DESC')
    if (entityType) qb.andWhere('log.entity_type = :entityType', { entityType })
    if (action) qb.andWhere('log.action = :action', { action })

    const total = await qb.getCount()
    const logs = await qb.take(limit).skip(offset).getMany()

    return NextResponse.json({ logs: toPlainArray(logs), total })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 500 }
    )
  }
}
