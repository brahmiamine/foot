import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { listMedicalEligibilities } from '@/lib/medicalEligibility'
import { MEDICAL_ELIGIBILITY_STATUSES, type MedicalEligibilityStatus } from '../../../../../../packages/regulatory-shared/src/medicalEligibility'
import { toPlainArray } from '@/lib/serialization'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const statusValue = searchParams.get('status')
  const status = statusValue && MEDICAL_ELIGIBILITY_STATUSES.includes(statusValue as MedicalEligibilityStatus) ? statusValue as MedicalEligibilityStatus : undefined
  try {
    const rows = await listMedicalEligibilities(await getDataSource(), session, { status, clubId: searchParams.get('clubId') || undefined, seasonId: searchParams.get('seasonId') || undefined, federationId: searchParams.get('federationId') || undefined, leagueId: searchParams.get('leagueId') || undefined })
    return NextResponse.json(toPlainArray(rows))
  } catch (error) {
    console.error('Error listing medical eligibilities:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des dossiers médicaux' }, { status: 500 })
  }
}
