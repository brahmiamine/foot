import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { createStadiumInspection, listStadiumInspections, StadiumInspectionAuthorizationError } from '@/lib/stadiumInspections'
import { STADIUM_INSPECTION_STATUSES, StadiumLicensingWorkflowError, type StadiumInspectionStatus } from '../../../../../../packages/regulatory-shared/src/stadiumLicensing'
import { toPlain, toPlainArray } from '@/lib/serialization'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const statusValue = searchParams.get('status')
  const status = statusValue && STADIUM_INSPECTION_STATUSES.includes(statusValue as StadiumInspectionStatus) ? statusValue as StadiumInspectionStatus : undefined
  try {
    const rows = await listStadiumInspections(await getDataSource(), session, { status, clubId: searchParams.get('clubId') || undefined, seasonId: searchParams.get('seasonId') || undefined, federationId: searchParams.get('federationId') || undefined, leagueId: searchParams.get('leagueId') || undefined })
    return NextResponse.json(toPlainArray(rows))
  } catch (error) {
    console.error('Error listing stadium inspections:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des inspections' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const inspection = await createStadiumInspection(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, body)
    return NextResponse.json(toPlain(inspection), { status: 201 })
  } catch (error) {
    if (error instanceof StadiumInspectionAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof StadiumLicensingWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error creating stadium inspection:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
