import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { AgentAuthorizationError, createFootballAgent, listFootballAgents } from '@/lib/agents'
import { AgentWorkflowError, FOOTBALL_AGENT_STATUSES, type FootballAgentStatus } from '../../../../../../packages/regulatory-shared/src/agents'
import { toPlain, toPlainArray } from '@/lib/serialization'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const statusValue = searchParams.get('status')
  const status = statusValue && FOOTBALL_AGENT_STATUSES.includes(statusValue as FootballAgentStatus) ? statusValue as FootballAgentStatus : undefined
  try {
    const rows = await listFootballAgents(await getDataSource(), session, { status, federationId: searchParams.get('federationId') || undefined })
    return NextResponse.json(toPlainArray(rows))
  } catch (error) {
    console.error('Error listing football agents:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des agents' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const agent = await createFootballAgent(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, body)
    return NextResponse.json(toPlain(agent), { status: 201 })
  } catch (error) {
    if (error instanceof AgentAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof AgentWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error creating football agent:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
