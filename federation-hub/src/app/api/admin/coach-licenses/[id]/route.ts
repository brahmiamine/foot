import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { CoachQualificationAuthorizationError, getCoachQualificationBundle } from '@/lib/coachQualifications'
import { CoachQualificationWorkflowError } from '../../../../../../../packages/regulatory-shared/src/coachQualification'
import { toPlain } from '@/lib/serialization'

export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    return NextResponse.json(toPlain(await getCoachQualificationBundle(await getDataSource(), session, id)))
  } catch (error) {
    if (error instanceof CoachQualificationAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof CoachQualificationWorkflowError) return NextResponse.json({ error: error.message }, { status: 404 })
    console.error('Error fetching coach qualification:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
