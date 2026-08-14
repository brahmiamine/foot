import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { PlayerRegistrationAuthorizationError, transitionPlayerRegistration } from '@/lib/playerRegistrations'
import { PlayerRegistrationWorkflowError, type PlayerRegistrationStatus } from '../../../../../../../../packages/regulatory-shared/src/playerRegistration'

export const runtime = 'nodejs'
const ACTIONS: Record<string, PlayerRegistrationStatus> = { approve: 'APPROVED', reject: 'REJECTED', suspend: 'SUSPENDED', reactivate: 'APPROVED', cancel: 'CANCELLED' }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, action } = await params
  const target = ACTIONS[action]
  if (!target) return NextResponse.json({ error: 'Action inconnue' }, { status: 404 })
  try { const body = await request.json().catch(() => ({})) as { reason?: string }; return NextResponse.json(await transitionPlayerRegistration(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, id, target, body.reason)) }
  catch (error) { if (error instanceof PlayerRegistrationAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 }); if (error instanceof PlayerRegistrationWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 }); console.error('Error applying registration decision:', error); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }) }
}
