import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { AgentAuthorizationError, createRepresentationAgreement } from '@/lib/agents'
import { AgentWorkflowError } from '../../../../../../../../packages/regulatory-shared/src/agents'

export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const body = await request.json()
    if (!body.startDate || !body.endDate) return NextResponse.json({ error: 'Dates requises' }, { status: 400 })
    const agreement = await createRepresentationAgreement(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, { ...body, agentId: id })
    return NextResponse.json(agreement, { status: 201 })
  } catch (error) {
    if (error instanceof AgentAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof AgentWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error creating representation agreement:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
