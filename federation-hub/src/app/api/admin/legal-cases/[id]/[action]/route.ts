import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { LegalCaseAuthorizationError, transitionLegalCase } from '@/lib/legalCases'
import { LegalCaseWorkflowError, type LegalCaseStatus } from '../../../../../../../../packages/regulatory-shared/src/legalCase'

export const runtime = 'nodejs'

const ACTIONS: Record<string, LegalCaseStatus> = { 'start-admissibility': 'ADMISSIBILITY_REVIEW', 'declare-inadmissible': 'INADMISSIBLE', accept: 'UNDER_REVIEW', hear: 'HEARD', 'mark-appealed': 'APPEALED', close: 'CLOSED', withdraw: 'WITHDRAWN' }

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, action } = await params
  const target = ACTIONS[action]
  if (!target) return NextResponse.json({ error: 'Action inconnue' }, { status: 404 })
  try {
    const body = await request.json().catch(() => ({})) as { reason?: string }
    const legalCase = await transitionLegalCase(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, id, target, body.reason)
    return NextResponse.json(legalCase)
  } catch (error) {
    if (error instanceof LegalCaseAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof LegalCaseWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error transitioning legal case:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
