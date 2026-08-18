import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getManualReviewDashboard } from '@/lib/refundOperationsClient'

export const runtime = 'nodejs'

function isPlatformRole(role: string): boolean {
  return role === 'SUPERADMIN' || role === 'PLATFORM_SUPERADMIN'
}

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isPlatformRole(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    return NextResponse.json(await getManualReviewDashboard())
  } catch (error) {
    console.error('Error loading manual refund dashboard:', error)
    return NextResponse.json(
      { error: 'Impossible de charger la file des remboursements manuels.' },
      { status: 502 },
    )
  }
}
