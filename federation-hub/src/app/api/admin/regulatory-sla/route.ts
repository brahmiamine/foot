import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { FederalOperationAuthorizationError, FederalOperationInputError } from '@/lib/federalOperationsCommon'
import { FederalOperationWorkflowError } from '@/lib/federalOperationsRules'
import { assertRegulatoryPermission, RegulatoryPermissionError } from '@/lib/regulatoryPermissions'
import { getRegulatorySlaOverdueQueue, listRegulatorySlaPolicies, upsertRegulatorySlaPolicy } from '@/lib/regulatorySla'
import { toPlain } from '@/lib/serialization'

export const runtime = 'nodejs'

function auditContext(request: NextRequest, session: { id: string; role: string }) {
  return { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }
}

function handleError(error: unknown) {
  if (error instanceof RegulatoryPermissionError || error instanceof FederalOperationAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
  if (error instanceof FederalOperationInputError) return NextResponse.json({ error: error.message }, { status: 400 })
  if (error instanceof FederalOperationWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
  console.error('Unexpected regulatory SLA API error:', error)
  return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
}

/** FED-010/GOV-008 : paramètres SLA + états de file avec échéance et escalade. */
export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const federationId = new URL(request.url).searchParams.get('federationId')
  if (!federationId) return NextResponse.json({ error: 'federationId requis' }, { status: 400 })
  try {
    const dataSource = await getDataSource()
    await assertRegulatoryPermission(dataSource, session, 'regulatory_sla.view')
    const [policies, overdueQueue] = await Promise.all([
      listRegulatorySlaPolicies(dataSource, session, federationId),
      getRegulatorySlaOverdueQueue(dataSource, session, federationId),
    ])
    return NextResponse.json(toPlain({ policies, overdueQueue }))
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const dataSource = await getDataSource()
    await assertRegulatoryPermission(dataSource, session, 'regulatory_sla.manage')
    const body = await request.json() as Record<string, unknown>
    const federationId = typeof body.federationId === 'string' ? body.federationId : ''
    if (!federationId) return NextResponse.json({ error: 'federationId requis' }, { status: 400 })
    const updated = await upsertRegulatorySlaPolicy(
      dataSource,
      session,
      auditContext(request, session),
      federationId,
      body.domain,
      body.warnAfterHours,
      body.overdueAfterHours,
      body.escalationAfterHours,
    )
    return NextResponse.json(updated)
  } catch (error) {
    return handleError(error)
  }
}
