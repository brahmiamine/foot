import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import {
  FederalOperationAuthorizationError,
  FederalOperationInputError,
} from '@/lib/federalOperationsCommon'
import {
  createGovernanceException,
  listGovernanceExceptions,
} from '@/lib/governanceExceptions'
import { assertRegulatoryPermission, RegulatoryPermissionError } from '@/lib/regulatoryPermissions'
import { toPlain } from '@/lib/serialization'

export const runtime = 'nodejs'

function auditContext(request: NextRequest, session: { id: string; role: string }) {
  return {
    userId: session.id,
    role: session.role,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: request.headers.get('user-agent'),
  }
}

function handleError(error: unknown) {
  if (error instanceof RegulatoryPermissionError || error instanceof FederalOperationAuthorizationError) {
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
  if (error instanceof FederalOperationInputError || error instanceof Error && error.name === 'ConfigurationAuditValidationError') {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  console.error('Unexpected governance exception API error:', error)
  return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
}

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const dataSource = await getDataSource()
    await assertRegulatoryPermission(dataSource, session, 'regulatory_policy.view')
    const federationId = new URL(request.url).searchParams.get('federationId')
    const rows = await listGovernanceExceptions(dataSource, session, federationId)
    return NextResponse.json(toPlain(rows))
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
    const created = await createGovernanceException(
      dataSource,
      session,
      auditContext(request, session),
      {
        federationId: body.federationId,
        leagueId: body.leagueId,
        ruleKey: body.ruleKey,
        targetType: body.targetType,
        targetId: body.targetId,
        reference: body.reference,
        reason: body.reason,
        validFrom: body.validFrom,
        validUntil: body.validUntil,
      },
    )
    return NextResponse.json(toPlain(created), { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
