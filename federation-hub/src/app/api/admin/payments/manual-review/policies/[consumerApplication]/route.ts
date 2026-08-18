import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import {
  getManualReviewPolicy,
  updateManualReviewPolicy,
  type UpdateManualReviewPolicyInput,
} from '@/lib/refundOperationsClient'

export const runtime = 'nodejs'

function isPlatformRole(role: string): boolean {
  return role === 'SUPERADMIN' || role === 'PLATFORM_SUPERADMIN'
}

async function getPlatformSession(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return null
  return isPlatformRole(session.role) ? session : null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ consumerApplication: string }> },
) {
  const session = await getPlatformSession(request)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { consumerApplication } = await params
  try {
    return NextResponse.json(await getManualReviewPolicy(consumerApplication))
  } catch (error) {
    console.error('Error loading manual refund policy:', error)
    return NextResponse.json({ error: 'Impossible de charger la policy.' }, { status: 502 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ consumerApplication: string }> },
) {
  const session = await getPlatformSession(request)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { consumerApplication } = await params

  try {
    const body = (await request.json()) as Partial<UpdateManualReviewPolicyInput>
    const values = [
      body.slaMinutes,
      body.reminderBeforeDueMinutes,
      body.escalationAfterDueMinutes,
    ]
    if (values.some((value) => !Number.isInteger(value))) {
      return NextResponse.json({ error: 'Paramètres SLA invalides.' }, { status: 400 })
    }
    return NextResponse.json(
      await updateManualReviewPolicy(
        consumerApplication,
        body as UpdateManualReviewPolicyInput,
        session.id,
      ),
    )
  } catch (error) {
    console.error('Error updating manual refund policy:', error)
    return NextResponse.json({ error: 'Impossible de modifier la policy.' }, { status: 502 })
  }
}
