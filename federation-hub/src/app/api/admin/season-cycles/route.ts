import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { createSeasonRegulatoryCycle, listSeasonRegulatoryCycles, SeasonRegulatoryCycleAuthorizationError } from '@/lib/seasonRegulatoryCycles'
import { SeasonRegulatoryCycleWorkflowError } from '../../../../../../packages/regulatory-shared/src/seasonRegulatoryCycle'
import { toPlain, toPlainArray } from '@/lib/serialization'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  try {
    const cycles = await listSeasonRegulatoryCycles(await getDataSource(), session, { federationId: searchParams.get('federationId') || undefined, leagueId: searchParams.get('leagueId') || undefined })
    return NextResponse.json(toPlainArray(cycles))
  } catch (error) {
    console.error('Error listing season regulatory cycles:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des cycles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    if (!body.seasonId) return NextResponse.json({ error: 'Saison requise' }, { status: 400 })
    const cycle = await createSeasonRegulatoryCycle(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, body)
    return NextResponse.json(toPlain(cycle), { status: 201 })
  } catch (error) {
    if (error instanceof SeasonRegulatoryCycleAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof SeasonRegulatoryCycleWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error creating season regulatory cycle:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
