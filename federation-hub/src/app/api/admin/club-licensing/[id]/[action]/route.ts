import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { transitionClubLicense, ClubLicenseAuthorizationError } from '@/lib/clubLicensing'
import { ClubLicenseWorkflowError, type ClubLicenseStatus } from '../../../../../../../../packages/regulatory-shared/src/clubLicensing'

export const runtime = 'nodejs'

const ACTION_STATUS: Record<string, ClubLicenseStatus> = {
  'start-review': 'UNDER_REVIEW',
  'request-changes': 'CHANGES_REQUESTED',
  approve: 'APPROVED',
  reject: 'REJECTED',
  suspend: 'SUSPENDED',
}

function clientIp(request: NextRequest): string | null {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, action } = await params
  const targetStatus = ACTION_STATUS[action]
  if (!targetStatus) return NextResponse.json({ error: 'Action inconnue' }, { status: 404 })

  try {
    const body = await request.json().catch(() => ({})) as { reason?: string }
    const application = await transitionClubLicense(
      await getDataSource(),
      session,
      {
        userId: session.id,
        role: session.role,
        ipAddress: clientIp(request),
        userAgent: request.headers.get('user-agent'),
      },
      id,
      targetStatus,
      body.reason,
    )
    return NextResponse.json(application)
  } catch (error) {
    if (error instanceof ClubLicenseAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof ClubLicenseWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error applying club licence decision:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
