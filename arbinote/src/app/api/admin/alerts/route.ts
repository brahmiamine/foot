import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getAlerts } from '@/lib/voteAlerting'
import { toPlainArray } from '@/lib/serialization'
import type { AlertStatus, AlertType } from '@/lib/entities'

export const runtime = 'nodejs'

/**
 * GET /api/admin/alerts
 * Liste les alertes avec filtres optionnels
 * Protégé par authentification admin
 */
export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const alertType = searchParams.get('alertType')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const { alerts, total } = await getAlerts({
      status: (status as AlertStatus) ?? undefined,
      alertType: (alertType as AlertType) ?? undefined,
      limit,
      offset,
    })

    return NextResponse.json({
      alerts: toPlainArray(alerts),
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Unexpected error in /api/admin/alerts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

