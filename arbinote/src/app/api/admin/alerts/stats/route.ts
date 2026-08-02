import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getAlerts, getUnresolvedAlertsCount } from '@/lib/voteAlerting'

export const runtime = 'nodejs'

/**
 * GET /api/admin/alerts/stats
 * Retourne les statistiques des alertes
 * Protégé par authentification admin
 */
export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const unresolvedCount = await getUnresolvedAlertsCount()
    const { alerts: allAlerts } = await getAlerts({ limit: 1000 })
    
    const stats = {
      total: allAlerts.length,
      unresolved: unresolvedCount,
      byType: {
        critical: allAlerts.filter(a => a.alert_type === 'critical').length,
        important: allAlerts.filter(a => a.alert_type === 'important').length,
      },
      byStatus: {
        new: allAlerts.filter(a => a.status === 'new').length,
        reviewed: allAlerts.filter(a => a.status === 'reviewed').length,
        resolved: allAlerts.filter(a => a.status === 'resolved').length,
        dismissed: allAlerts.filter(a => a.status === 'dismissed').length,
      },
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Unexpected error in /api/admin/alerts/stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

