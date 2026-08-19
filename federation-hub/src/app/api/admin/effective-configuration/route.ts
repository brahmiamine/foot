import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { assertFederalOperationScope, FederalOperationAuthorizationError } from '@/lib/federalOperationsCommon'
import { assertRegulatoryPermission, RegulatoryPermissionError } from '@/lib/regulatoryPermissions'
import { resolveRegulatoryPolicyInternal } from '@/lib/regulatoryPolicyCenter'
import { toEffectiveConfigurationSection } from '../../../../../packages/domain-contracts/src/effective-configuration'

export const runtime = 'nodejs'

function handleError(error: unknown) {
  if (error instanceof RegulatoryPermissionError || error instanceof FederalOperationAuthorizationError) {
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
  console.error('Unexpected effective configuration API error:', error)
  return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
}

/** GOV-006 — résolution read-only normalisée avec provenance par valeur. */
export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const federationId = searchParams.get('federationId')
  if (!federationId) return NextResponse.json({ error: 'federationId requis' }, { status: 400 })
  const leagueId = searchParams.get('leagueId')
  const seasonId = searchParams.get('seasonId')
  const rawAt = searchParams.get('at')
  const at = rawAt ? new Date(rawAt) : new Date()
  if (Number.isNaN(at.getTime())) return NextResponse.json({ error: 'Date de résolution invalide' }, { status: 400 })

  try {
    const dataSource = await getDataSource()
    await assertRegulatoryPermission(dataSource, session, 'regulatory_policy.view')
    assertFederalOperationScope(session, federationId, leagueId ?? undefined)
    const resolved = await resolveRegulatoryPolicyInternal(dataSource, federationId, leagueId, seasonId, at)
    return NextResponse.json({
      at: at.toISOString(),
      context: { federationId, leagueId, seasonId },
      sections: [
        toEffectiveConfigurationSection(
          'FEDERATION_REGULATORY_POLICY',
          'Politique réglementaire fédérale',
          resolved,
        ),
      ],
    })
  } catch (error) {
    return handleError(error)
  }
}
