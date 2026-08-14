import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { reviewClubLicenseRequirement, ClubLicenseAuthorizationError } from '@/lib/clubLicensing'
import {
  CLUB_LICENSE_REQUIREMENT_STATUSES,
  ClubLicenseWorkflowError,
  type ClubLicenseRequirementStatus,
} from '../../../../../../../../../packages/regulatory-shared/src/clubLicensing'

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requirementId: string }> },
) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, requirementId } = await params
  try {
    const body = await request.json() as {
      status?: string
      reviewComment?: string
      waiverReason?: string
    }
    if (!body.status || !CLUB_LICENSE_REQUIREMENT_STATUSES.includes(body.status as ClubLicenseRequirementStatus)) {
      return NextResponse.json({ error: 'Statut d’exigence invalide' }, { status: 400 })
    }
    const requirement = await reviewClubLicenseRequirement(
      await getDataSource(),
      session,
      {
        userId: session.id,
        role: session.role,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        userAgent: request.headers.get('user-agent'),
      },
      id,
      requirementId,
      body.status as ClubLicenseRequirementStatus,
      body.reviewComment,
      body.waiverReason,
    )
    return NextResponse.json(requirement)
  } catch (error) {
    if (error instanceof ClubLicenseAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof ClubLicenseWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error reviewing club licence requirement:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
