import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { getPlayerRegistrationBundle, PlayerRegistrationAuthorizationError } from '@/lib/playerRegistrations'
import { PlayerRegistrationWorkflowError } from '../../../../../../../packages/regulatory-shared/src/playerRegistration'
import { toPlain } from '@/lib/serialization'

export const runtime = 'nodejs'
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try { const { id } = await params; return NextResponse.json(toPlain(await getPlayerRegistrationBundle(await getDataSource(), session, id))) }
  catch (error) { if (error instanceof PlayerRegistrationAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 }); if (error instanceof PlayerRegistrationWorkflowError) return NextResponse.json({ error: error.message }, { status: 404 }); console.error('Error loading player registration:', error); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }) }
}
