import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { approveBoardMember, GovernanceAuthorizationError } from '@/lib/governance'
import { GovernanceWorkflowError } from '../../../../../../../../../../packages/regulatory-shared/src/governance'

export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, memberId } = await params
  try {
    const member = await approveBoardMember(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, id, memberId)
    return NextResponse.json(member)
  } catch (error) {
    if (error instanceof GovernanceAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof GovernanceWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error approving board member:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
