import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { PersonLicenseAuthorizationError, transitionPersonLicense } from '@/lib/personLicensing'
import { PersonLicenseWorkflowError, type PersonLicenseStatus } from '../../../../../../../../packages/regulatory-shared/src/personLicensing'

export const runtime = 'nodejs'

const ACTION_STATUS: Record<string, PersonLicenseStatus> = {
  'start-review': 'UNDER_REVIEW',
  approve: 'APPROVED',
  reject: 'REJECTED',
  suspend: 'SUSPENDED',
  reactivate: 'APPROVED',
  expire: 'EXPIRED',
  revoke: 'REVOKED',
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, action } = await params
  const targetStatus = ACTION_STATUS[action]
  if (!targetStatus) return NextResponse.json({ error: 'Action inconnue' }, { status: 404 })
  try {
    const body = await request.json().catch(() => ({})) as { reason?: string; licenseNumber?: string; category?: string; expiresAt?: string }
    const license = await transitionPersonLicense(await getDataSource(), session, {
      userId: session.id,
      role: session.role,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: request.headers.get('user-agent'),
    }, id, targetStatus, body)
    return NextResponse.json(license)
  } catch (error) {
    if (error instanceof PersonLicenseAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof PersonLicenseWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error applying person license decision:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
