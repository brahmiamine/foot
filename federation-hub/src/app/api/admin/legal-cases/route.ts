import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { createLegalCase, listLegalCases, LegalCaseAuthorizationError } from '@/lib/legalCases'
import { LEGAL_CASE_CATEGORIES, LEGAL_CASE_STATUSES, LegalCaseWorkflowError, type LegalCaseCategory, type LegalCaseStatus } from '../../../../../../packages/regulatory-shared/src/legalCase'
import { toPlain, toPlainArray } from '@/lib/serialization'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const statusValue = searchParams.get('status')
  const categoryValue = searchParams.get('category')
  const status = statusValue && LEGAL_CASE_STATUSES.includes(statusValue as LegalCaseStatus) ? statusValue as LegalCaseStatus : undefined
  const category = categoryValue && LEGAL_CASE_CATEGORIES.includes(categoryValue as LegalCaseCategory) ? categoryValue as LegalCaseCategory : undefined
  try {
    const cases = await listLegalCases(await getDataSource(), session, { status, category, federationId: searchParams.get('federationId') || undefined, leagueId: searchParams.get('leagueId') || undefined, seasonId: searchParams.get('seasonId') || undefined })
    return NextResponse.json(toPlainArray(cases))
  } catch (error) {
    console.error('Error listing legal cases:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des litiges' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const legalCase = await createLegalCase(await getDataSource(), session, { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }, body)
    return NextResponse.json(toPlain(legalCase), { status: 201 })
  } catch (error) {
    if (error instanceof LegalCaseAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof LegalCaseWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error creating legal case:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
