import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { listPlayerRegistrations } from '@/lib/playerRegistrations'
import { PLAYER_REGISTRATION_STATUSES, type PlayerRegistrationStatus } from '../../../../../../packages/regulatory-shared/src/playerRegistration'
import { toPlain } from '@/lib/serialization'

export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const statusValue = searchParams.get('status')
  const status = statusValue && PLAYER_REGISTRATION_STATUSES.includes(statusValue as PlayerRegistrationStatus) ? statusValue as PlayerRegistrationStatus : undefined
  try { return NextResponse.json(toPlain(await listPlayerRegistrations(await getDataSource(), session, { status, seasonId: searchParams.get('seasonId') || undefined, federationId: searchParams.get('federationId') || undefined, leagueId: searchParams.get('leagueId') || undefined, clubId: searchParams.get('clubId') || undefined, eligibilityStatus: searchParams.get('eligibilityStatus') || undefined }))) }
  catch (error) { console.error('Error listing player registrations:', error); return NextResponse.json({ error: 'Erreur lors du chargement des enregistrements' }, { status: 500 }) }
}
