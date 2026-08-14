import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { SeasonRegulatoryCycleAuthorizationError, setClubLicensingWindow } from '@/lib/seasonRegulatoryCycles'
import { SeasonRegulatoryCycleWorkflowError } from '../../../../../../../../packages/regulatory-shared/src/seasonRegulatoryCycle'

export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const body = await request.json()
    if (!body.opensAt) return NextResponse.json({ error: 'Date d’ouverture requise' }, { status: 400 })
    return NextResponse.json(await setClubLicensingWindow(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, id, body))
  } catch (error) {
    if (error instanceof SeasonRegulatoryCycleAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof SeasonRegulatoryCycleWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error setting club licensing window:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
