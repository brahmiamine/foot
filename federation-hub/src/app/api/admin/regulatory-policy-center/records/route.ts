import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { FederalOperationAuthorizationError, FederalOperationInputError } from '@/lib/federalOperationsCommon'
import { assertRegulatoryPermission, RegulatoryPermissionError } from '@/lib/regulatoryPermissions'
import { listRegulatoryPolicyRecords } from '@/lib/regulatoryPolicyCenter'
import { toPlainArray } from '@/lib/serialization'

export const runtime = 'nodejs'

/** FED-001 : liste brute des versions de politiques réglementaires déjà enregistrées pour une fédération, pour l'écran d'administration. */
export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const federationId = searchParams.get('federationId')
  if (!federationId) return NextResponse.json({ error: 'federationId requis' }, { status: 400 })
  try {
    const dataSource = await getDataSource()
    await assertRegulatoryPermission(dataSource, session, 'regulatory_policy.view')
    const rows = await listRegulatoryPolicyRecords(dataSource, session, federationId, searchParams.get('leagueId'))
    return NextResponse.json(toPlainArray(rows))
  } catch (error) {
    if (error instanceof RegulatoryPermissionError || error instanceof FederalOperationAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof FederalOperationInputError) return NextResponse.json({ error: error.message }, { status: 400 })
    console.error('Unexpected regulatory policy records API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
