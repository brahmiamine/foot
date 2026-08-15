import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { DisciplinaryCaseAuthorizationError, transitionDisciplinaryCase } from '@/lib/disciplinaryCases'
import { DisciplinaryCaseWorkflowError, type DisciplinaryCaseStatus } from '../../../../../../../../packages/regulatory-shared/src/disciplinaryCase'

export const runtime = 'nodejs'

const ACTIONS: Record<string, DisciplinaryCaseStatus> = { 'start-review': 'UNDER_REVIEW', 'mark-appealed': 'APPEALED', close: 'CLOSED' }

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, action } = await params
  const target = ACTIONS[action]
  if (!target) return NextResponse.json({ error: 'Action inconnue' }, { status: 404 })
  try {
    const body = await request.json().catch(() => ({})) as { reason?: string }
    const item = await transitionDisciplinaryCase(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, id, target, body.reason)
    return NextResponse.json(item)
  } catch (error) {
    if (error instanceof DisciplinaryCaseAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof DisciplinaryCaseWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error transitioning disciplinary case:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
