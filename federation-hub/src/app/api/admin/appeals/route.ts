import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { AppealAuthorizationError, listAppeals, submitAppeal } from '@/lib/appeals'
import { APPEAL_STATUSES, AppealWorkflowError, type AppealStatus } from '../../../../../../packages/regulatory-shared/src/appeals'
import { toPlain, toPlainArray } from '@/lib/serialization'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const statusValue = searchParams.get('status')
  const status = statusValue && APPEAL_STATUSES.includes(statusValue as AppealStatus) ? statusValue as AppealStatus : undefined
  try {
    const rows = await listAppeals(await getDataSource(), session, { status, federationId: searchParams.get('federationId') || undefined, leagueId: searchParams.get('leagueId') || undefined })
    return NextResponse.json(toPlainArray(rows))
  } catch (error) {
    console.error('Error listing appeals:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des appels' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const appeal = await submitAppeal(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, body)
    return NextResponse.json(toPlain(appeal), { status: 201 })
  } catch (error) {
    if (error instanceof AppealAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof AppealWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error submitting appeal:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
