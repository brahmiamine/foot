import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { listFinancialCompliance } from '@/lib/financialCompliance'
import { FINANCIAL_COMPLIANCE_STATUSES, type FinancialComplianceStatus } from '../../../../../../packages/regulatory-shared/src/financialCompliance'
import { toPlainArray } from '@/lib/serialization'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const statusValue = searchParams.get('status')
  const status = statusValue && FINANCIAL_COMPLIANCE_STATUSES.includes(statusValue as FinancialComplianceStatus) ? statusValue as FinancialComplianceStatus : undefined
  try {
    const rows = await listFinancialCompliance(await getDataSource(), session, { status, seasonId: searchParams.get('seasonId') || undefined, federationId: searchParams.get('federationId') || undefined, leagueId: searchParams.get('leagueId') || undefined })
    return NextResponse.json(toPlainArray(rows))
  } catch (error) {
    console.error('Error listing financial compliance:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des dossiers financiers' }, { status: 500 })
  }
}
