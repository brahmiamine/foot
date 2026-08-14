import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { createClubSanction, listClubSanctions, ClubSanctionAuthorizationError } from '@/lib/clubSanctions'
import { CLUB_SANCTION_STATUSES, CLUB_SANCTION_TYPES, ClubSanctionWorkflowError, type ClubSanctionStatus, type ClubSanctionType } from '../../../../../../packages/regulatory-shared/src/clubSanction'
import { toPlain, toPlainArray } from '@/lib/serialization'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const statusValue = searchParams.get('status')
  const typeValue = searchParams.get('type')
  const status = statusValue && CLUB_SANCTION_STATUSES.includes(statusValue as ClubSanctionStatus) ? statusValue as ClubSanctionStatus : undefined
  const type = typeValue && CLUB_SANCTION_TYPES.includes(typeValue as ClubSanctionType) ? typeValue as ClubSanctionType : undefined
  try {
    const sanctions = await listClubSanctions(await getDataSource(), session, { status, type, clubId: searchParams.get('clubId') || undefined, seasonId: searchParams.get('seasonId') || undefined, federationId: searchParams.get('federationId') || undefined, leagueId: searchParams.get('leagueId') || undefined })
    return NextResponse.json(toPlainArray(sanctions))
  } catch (error) {
    console.error('Error listing club sanctions:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des sanctions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const sanction = await createClubSanction(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, body)
    return NextResponse.json(toPlain(sanction), { status: 201 })
  } catch (error) {
    if (error instanceof ClubSanctionAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof ClubSanctionWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error creating club sanction:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
