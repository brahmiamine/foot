import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { decideStadiumInspection, StadiumInspectionAuthorizationError } from '@/lib/stadiumInspections'
import { StadiumLicensingWorkflowError, type StadiumInspectionStatus } from '../../../../../../../../packages/regulatory-shared/src/stadiumLicensing'

export const runtime = 'nodejs'

const ACTIONS: Record<string, StadiumInspectionStatus> = { approve: 'APPROVED', 'approve-with-restrictions': 'APPROVED_WITH_RESTRICTIONS', reject: 'REJECTED', suspend: 'SUSPENDED', reactivate: 'APPROVED', expire: 'EXPIRED' }

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, action } = await params
  const target = ACTIONS[action]
  if (!target) return NextResponse.json({ error: 'Action inconnue' }, { status: 404 })
  try {
    const body = await request.json().catch(() => ({})) as { reason?: string; expiresAt?: string; restrictions?: string[] }
    const inspection = await decideStadiumInspection(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, id, target, body)
    return NextResponse.json(inspection)
  } catch (error) {
    if (error instanceof StadiumInspectionAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof StadiumLicensingWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error deciding stadium inspection:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
