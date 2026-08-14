import { NextRequest, NextResponse } from 'next/server'
import { canAccessPlatform, getRefereeDomainSession } from '@/lib/adminAuth'
import { updateOfficialCriterion } from '@/lib/officialRefereeCriteria'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getRefereeDomainSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccessPlatform(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const { id } = await params
    return NextResponse.json(await updateOfficialCriterion(id, await request.json()))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Requête invalide' }, { status: 400 })
  }
}
