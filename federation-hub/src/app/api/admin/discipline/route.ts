import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { DisciplinaryCaseAuthorizationError, listDisciplinaryCases, openDisciplinaryCase } from '@/lib/disciplinaryCases'
import { DISCIPLINARY_CASE_STATUSES, DisciplinaryCaseWorkflowError, type DisciplinaryCaseStatus } from '../../../../../../packages/regulatory-shared/src/disciplinaryCase'
import { toPlain, toPlainArray } from '@/lib/serialization'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const statusValue = searchParams.get('status')
  const status = statusValue && DISCIPLINARY_CASE_STATUSES.includes(statusValue as DisciplinaryCaseStatus) ? statusValue as DisciplinaryCaseStatus : undefined
  try {
    const rows = await listDisciplinaryCases(await getDataSource(), session, { status, clubId: searchParams.get('clubId') || undefined, federationId: searchParams.get('federationId') || undefined, leagueId: searchParams.get('leagueId') || undefined })
    return NextResponse.json(toPlainArray(rows))
  } catch (error) {
    console.error('Error listing disciplinary cases:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des dossiers disciplinaires' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const item = await openDisciplinaryCase(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, body)
    return NextResponse.json(toPlain(item), { status: 201 })
  } catch (error) {
    if (error instanceof DisciplinaryCaseAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof DisciplinaryCaseWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error opening disciplinary case:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
