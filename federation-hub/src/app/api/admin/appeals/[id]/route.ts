import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { AppealAuthorizationError, getAppealBundle } from '@/lib/appeals'
import { AppealWorkflowError } from '../../../../../../../packages/regulatory-shared/src/appeals'
import { toPlain } from '@/lib/serialization'

export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    return NextResponse.json(toPlain(await getAppealBundle(await getDataSource(), session, id)))
  } catch (error) {
    if (error instanceof AppealAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof AppealWorkflowError) return NextResponse.json({ error: error.message }, { status: 404 })
    console.error('Error fetching appeal:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
