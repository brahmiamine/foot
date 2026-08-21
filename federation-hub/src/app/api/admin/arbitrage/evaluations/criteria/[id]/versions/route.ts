import { NextRequest, NextResponse } from 'next/server'
import { canAccessPlatform, getRefereeDomainSession } from '@/lib/adminAuth'
import { listOfficialCriterionVersions } from '@/lib/officialRefereeCriteria'

/** REF-007 — historique complet des versions d'un critère (non-rétroactivité, audit). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getRefereeDomainSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccessPlatform(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  return NextResponse.json(await listOfficialCriterionVersions(id))
}
