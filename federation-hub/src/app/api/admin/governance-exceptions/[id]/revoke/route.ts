import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import {
  FederalOperationAuthorizationError,
  FederalOperationInputError,
} from '@/lib/federalOperationsCommon'
import { revokeGovernanceException } from '@/lib/governanceExceptions'
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const dataSource = await getDataSource()
    await assertRegulatoryPermission(dataSource, session, 'regulatory_policy.manage')
    const { id } = await context.params
    const body = await request.json() as Record<string, unknown>
    const revoked = await revokeGovernanceException(
      dataSource,
      session,
      auditContext(request, session),
      id,
      body.reason,
    )
    return NextResponse.json(toPlain(revoked))
  } catch (error) {
    if (error instanceof RegulatoryPermissionError || error instanceof FederalOperationAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof FederalOperationInputError || error instanceof Error && error.name === 'ConfigurationAuditValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Unexpected governance exception revoke API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
