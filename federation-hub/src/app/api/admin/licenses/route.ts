import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { listPersonLicenses } from '@/lib/personLicensing'
import { PERSON_LICENSE_STATUSES, PERSON_LICENSE_TYPES, type PersonLicenseStatus, type PersonLicenseType } from '../../../../../../packages/regulatory-shared/src/personLicensing'
import { toPlain } from '@/lib/serialization'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const statusValue = searchParams.get('status')
  const typeValue = searchParams.get('personType')
  const status = statusValue && PERSON_LICENSE_STATUSES.includes(statusValue as PersonLicenseStatus) ? statusValue as PersonLicenseStatus : undefined
  const personType = typeValue && PERSON_LICENSE_TYPES.includes(typeValue as PersonLicenseType) ? typeValue as PersonLicenseType : undefined
  try {
    const licenses = await listPersonLicenses(await getDataSource(), session, {
      status,
      personType,
      seasonId: searchParams.get('seasonId') || undefined,
      federationId: searchParams.get('federationId') || undefined,
      leagueId: searchParams.get('leagueId') || undefined,
      clubId: searchParams.get('clubId') || undefined,
    })
    return NextResponse.json(toPlain(licenses))
  } catch (error) {
    console.error('Error listing person licenses:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des licences' }, { status: 500 })
  }
}
