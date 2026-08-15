import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { AppealAuthorizationError, transitionAppeal } from '@/lib/appeals'
import { AppealWorkflowError, type AppealStatus } from '../../../../../../../../packages/regulatory-shared/src/appeals'

export const runtime = 'nodejs'

const ACTIONS: Record<string, AppealStatus> = { 'start-admissibility': 'ADMISSIBILITY_REVIEW', accept: 'UNDER_REVIEW', 'declare-inadmissible': 'REJECTED', hear: 'HEARING', decide: 'DECIDED', withdraw: 'WITHDRAWN' }

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, action } = await params
  const target = ACTIONS[action]
  if (!target) return NextResponse.json({ error: 'Action inconnue' }, { status: 404 })
  try {
    const body = await request.json().catch(() => ({})) as { reason?: string; decisionSummary?: string }
    const appeal = await transitionAppeal(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, id, target, body)
    return NextResponse.json(appeal)
  } catch (error) {
    if (error instanceof AppealAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof AppealWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error transitioning appeal:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
