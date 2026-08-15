import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { DisciplinaryCaseAuthorizationError, scheduleDisciplinaryHearing } from '@/lib/disciplinaryCases'
import { DisciplinaryCaseWorkflowError } from '../../../../../../../../packages/regulatory-shared/src/disciplinaryCase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const body = await request.json()
    if (!body.scheduledAt) return NextResponse.json({ error: 'Date d’audience requise' }, { status: 400 })
    const item = await scheduleDisciplinaryHearing(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, id, body)
    return NextResponse.json(item)
  } catch (error) {
    if (error instanceof DisciplinaryCaseAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof DisciplinaryCaseWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error scheduling disciplinary hearing:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
