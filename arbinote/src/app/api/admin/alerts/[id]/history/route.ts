import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { AuditLog } from '@/lib/entities'
import { toPlainArray } from '@/lib/serialization'

export const runtime = 'nodejs'

/**
 * GET /api/admin/alerts/[id]/history
 * Historique de modération de l'alerte (US-40) : admin, date, état
 * précédent/nouvel état, motif — reconstruit depuis audit_logs
 * (entity_type='alert'), seule source qui garde une trace de chaque
 * transition. `vote_alerts.reviewed_by`/`reviewed_at` (TS-39) ne portent
 * que la dernière décision, pas l'historique complet.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params

    const dataSource = await getDataSource()
    const auditRepo = dataSource.getRepository<AuditLog>('audit_logs')

    const entries = await auditRepo.find({
      where: { entity_type: 'alert', entity_id: id },
      order: { created_at: 'DESC' },
    })

    return NextResponse.json(toPlainArray(entries))
  } catch (error) {
    console.error('Unexpected error in /api/admin/alerts/[id]/history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
