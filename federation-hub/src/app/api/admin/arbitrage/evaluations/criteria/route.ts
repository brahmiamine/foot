import { NextRequest, NextResponse } from 'next/server'
import { canAccessPlatform, getRefereeDomainSession } from '@/lib/adminAuth'
import { createOfficialCriterion, listOfficialCriteria } from '@/lib/officialRefereeCriteria'

export async function GET(request: NextRequest) {
  const session = await getRefereeDomainSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const seasonId = request.nextUrl.searchParams.get('season_id')
  const competitionId = request.nextUrl.searchParams.get('competition_id')
  return NextResponse.json(
    await listOfficialCriteria({ activeOnly: !canAccessPlatform(session), seasonId, competitionId }),
  )
}

export async function POST(request: NextRequest) {
  const session = await getRefereeDomainSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccessPlatform(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    return NextResponse.json(await createOfficialCriterion(await request.json()), { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Requête invalide' }, { status: 400 })
  }
}
