import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { decideMedicalEligibility, MedicalEligibilityAuthorizationError } from '@/lib/medicalEligibility'
import { MedicalEligibilityWorkflowError, type MedicalEligibilityStatus } from '../../../../../../../../packages/regulatory-shared/src/medicalEligibility'

export const runtime = 'nodejs'

const ACTIONS: Record<string, MedicalEligibilityStatus> = { 'mark-fit': 'FIT', 'mark-unfit': 'UNFIT', suspend: 'SUSPENDED', reactivate: 'FIT', expire: 'EXPIRED' }

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, action } = await params
  const target = ACTIONS[action]
  if (!target) return NextResponse.json({ error: 'Action inconnue' }, { status: 404 })
  try {
    const body = await request.json().catch(() => ({})) as { reason?: string; expiresAt?: string }
    const item = await decideMedicalEligibility(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, id, target, body)
    return NextResponse.json(item)
  } catch (error) {
    if (error instanceof MedicalEligibilityAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof MedicalEligibilityWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error deciding medical eligibility:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
