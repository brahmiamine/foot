import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { LegalCaseAuthorizationError, recordLegalCaseDecision } from '@/lib/legalCases'
import { LegalCaseWorkflowError } from '../../../../../../../../packages/regulatory-shared/src/legalCase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const body = await request.json()
    const legalCase = await recordLegalCaseDecision(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, id, body)
    return NextResponse.json(legalCase)
  } catch (error) {
    if (error instanceof LegalCaseAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof LegalCaseWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error recording legal case decision:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
