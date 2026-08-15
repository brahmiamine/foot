import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { AgentAuthorizationError, transitionFootballAgent } from '@/lib/agents'
import { AgentWorkflowError, type FootballAgentStatus } from '../../../../../../../../packages/regulatory-shared/src/agents'

export const runtime = 'nodejs'

const ACTIONS: Record<string, FootballAgentStatus> = { activate: 'ACTIVE', suspend: 'SUSPENDED', reactivate: 'ACTIVE', revoke: 'REVOKED', expire: 'EXPIRED' }

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, action } = await params
  const target = ACTIONS[action]
  if (!target) return NextResponse.json({ error: 'Action inconnue' }, { status: 404 })
  try {
    const body = await request.json().catch(() => ({})) as { reason?: string; validFrom?: string; validUntil?: string }
    const agent = await transitionFootballAgent(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, id, target, body)
    return NextResponse.json(agent)
  } catch (error) {
    if (error instanceof AgentAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof AgentWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error transitioning football agent:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
