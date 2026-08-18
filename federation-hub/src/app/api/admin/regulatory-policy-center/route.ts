import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { FederalOperationAuthorizationError, FederalOperationInputError } from '@/lib/federalOperationsCommon'
import { FederalOperationWorkflowError } from '@/lib/federalOperationsRules'
import { assertRegulatoryPermission, RegulatoryPermissionError } from '@/lib/regulatoryPermissions'
import { createRegulatoryPolicyRecord, resolveRegulatoryPolicy } from '@/lib/regulatoryPolicyCenter'
import { toPlain } from '@/lib/serialization'

export const runtime = 'nodejs'

function auditContext(request: NextRequest, session: { id: string; role: string }) {
  return { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }
}

function handleError(error: unknown) {
  if (error instanceof RegulatoryPermissionError || error instanceof FederalOperationAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
  if (error instanceof FederalOperationInputError) return NextResponse.json({ error: error.message }, { status: 400 })
  if (error instanceof FederalOperationWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
  console.error('Unexpected regulatory policy center API error:', error)
  return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
}

/** FED-001 : résout la politique réglementaire effective (avec provenance) et les exigences documentaires applicables pour un scope donné. */
export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const federationId = searchParams.get('federationId')
  if (!federationId) return NextResponse.json({ error: 'federationId requis' }, { status: 400 })
  try {
    const dataSource = await getDataSource()
    await assertRegulatoryPermission(dataSource, session, 'regulatory_policy.view')
    const result = await resolveRegulatoryPolicy(dataSource, session, {
      federationId,
      leagueId: searchParams.get('leagueId'),
      seasonId: searchParams.get('seasonId'),
    })
    return NextResponse.json(toPlain(result))
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const dataSource = await getDataSource()
    await assertRegulatoryPermission(dataSource, session, 'regulatory_policy.manage')
    const body = await request.json() as Record<string, unknown>
    const created = await createRegulatoryPolicyRecord(dataSource, session, auditContext(request, session), body)
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
