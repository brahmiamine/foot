import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { listBoardMandates } from '@/lib/governance'
import { BOARD_MANDATE_STATUSES, type BoardMandateStatus } from '../../../../../../packages/regulatory-shared/src/governance'
import { toPlainArray } from '@/lib/serialization'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const statusValue = searchParams.get('status')
  const status = statusValue && BOARD_MANDATE_STATUSES.includes(statusValue as BoardMandateStatus) ? statusValue as BoardMandateStatus : undefined
  try {
    const rows = await listBoardMandates(await getDataSource(), session, { status, federationId: searchParams.get('federationId') || undefined, leagueId: searchParams.get('leagueId') || undefined })
    return NextResponse.json(toPlainArray(rows))
  } catch (error) {
    console.error('Error listing board mandates:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des mandats' }, { status: 500 })
  }
}
