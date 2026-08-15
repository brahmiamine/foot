import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { listCoachQualifications } from '@/lib/coachQualifications'
import { COACH_QUALIFICATION_STATUSES, type CoachQualificationStatus } from '../../../../../../packages/regulatory-shared/src/coachQualification'
import { toPlainArray } from '@/lib/serialization'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const statusValue = searchParams.get('status')
  const status = statusValue && COACH_QUALIFICATION_STATUSES.includes(statusValue as CoachQualificationStatus) ? statusValue as CoachQualificationStatus : undefined
  try {
    const rows = await listCoachQualifications(await getDataSource(), session, { status, clubId: searchParams.get('clubId') || undefined, federationId: searchParams.get('federationId') || undefined, leagueId: searchParams.get('leagueId') || undefined })
    return NextResponse.json(toPlainArray(rows))
  } catch (error) {
    console.error('Error listing coach qualifications:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des qualifications' }, { status: 500 })
  }
}
