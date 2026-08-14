import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { FinancialComplianceAuthorizationError, transitionFinancialCompliance } from '@/lib/financialCompliance'
import { FinancialComplianceWorkflowError, type FinancialComplianceStatus } from '../../../../../../../../packages/regulatory-shared/src/financialCompliance'

export const runtime = 'nodejs'

const ACTIONS: Record<string, FinancialComplianceStatus> = { 'start-review': 'UNDER_REVIEW', compliant: 'COMPLIANT', conditional: 'CONDITIONAL', 'non-compliant': 'NON_COMPLIANT' }

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, action } = await params
  const target = ACTIONS[action]
  if (!target) return NextResponse.json({ error: 'Action inconnue' }, { status: 404 })
  try {
    const body = await request.json().catch(() => ({})) as { comment?: string }
    const item = await transitionFinancialCompliance(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, id, target, body.comment)
    return NextResponse.json(item)
  } catch (error) {
    if (error instanceof FinancialComplianceAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof FinancialComplianceWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error transitioning financial compliance:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
