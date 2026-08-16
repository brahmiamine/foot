import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { createFederalCommission, listFederalCommissionDecisions, listFederalCommissions, listFederalCommissionSessions } from '@/lib/federalCommissions'
import { assertFederalOperationCreateReferences } from '@/lib/federalOperationCreateGuards'
import { FederalOperationAuthorizationError, FederalOperationInputError } from '@/lib/federalOperationsCommon'
import { FederalOperationWorkflowError } from '@/lib/federalOperationsRules'
import { createBroadcastingDistribution, createDocumentRequirement, createFederationGrant, createInsurancePolicy, createSolidarityContribution, createTrainingCompensationCase, listFederalProgramDomain, type FederalProgramDomain } from '@/lib/federalPrograms'
import { listInsurancePolicies, normalizeBroadcastingAllocations } from '@/lib/federalProgramViews'
import { getFederalSeasonReadiness, prepareFederalSeasonOperations } from '@/lib/federalSeasonOperations'
import { createNationalTeam, listNationalTeams } from '@/lib/nationalTeams'
import { assertRegulatoryPermission, RegulatoryPermissionError, type RegulatoryPermission } from '@/lib/regulatoryPermissions'

export const runtime = 'nodejs'

type Context = { params: Promise<{ domain: string }> }
const PROGRAM_DOMAINS = new Set<FederalProgramDomain>(['grants', 'broadcasting', 'training-compensation', 'solidarity', 'documents'])

function auditContext(request: NextRequest, session: { id: string; role: string }) {
  return { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }
}

function permissionFor(domain: string, write: boolean): RegulatoryPermission | null {
  const map: Record<string, [RegulatoryPermission, RegulatoryPermission]> = {
    commissions: ['commission.view', 'commission.manage'],
    insurance: ['insurance.view', 'insurance.review'],
    grants: ['grant.view', 'grant.manage'],
    broadcasting: ['broadcasting.view', 'broadcasting.manage'],
    'training-compensation': ['training_compensation.view', 'training_compensation.manage'],
    solidarity: ['solidarity.view', 'solidarity.manage'],
    documents: ['document_compliance.view', 'document_compliance.review'],
    'national-teams': ['national_team.view', 'national_team.manage'],
    'season-cycle': ['season_cycle.view', 'season_cycle.manage'],
  }
  return map[domain]?.[write ? 1 : 0] ?? null
}

function handleError(error: unknown) {
  if (error instanceof RegulatoryPermissionError || error instanceof FederalOperationAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
  if (error instanceof FederalOperationInputError) return NextResponse.json({ error: error.message }, { status: 400 })
  if (error instanceof FederalOperationWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
  console.error('Unexpected federal operations API error:', error)
  return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
}

export async function GET(request: NextRequest, { params }: Context) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { domain } = await params
  const permission = permissionFor(domain, false)
  if (!permission) return NextResponse.json({ error: 'Domaine inconnu' }, { status: 404 })
  try {
    const dataSource = await getDataSource()
    await assertRegulatoryPermission(dataSource, session, permission)
    if (domain === 'commissions') {
      const [items, sessions, decisions] = await Promise.all([
        listFederalCommissions(dataSource, session),
        listFederalCommissionSessions(dataSource, session),
        listFederalCommissionDecisions(dataSource, session),
      ])
      return NextResponse.json({ items, sessions, decisions })
    }
    if (domain === 'insurance') return NextResponse.json(await listInsurancePolicies(dataSource, session))
    if (domain === 'national-teams') {
      if (session.role === 'LEAGUE_ADMIN') return NextResponse.json([])
      return NextResponse.json(await listNationalTeams(dataSource, session))
    }
    if (domain === 'season-cycle') {
      const cycleId = new URL(request.url).searchParams.get('cycleId')
      if (!cycleId) return NextResponse.json({ error: 'cycleId requis' }, { status: 400 })
      return NextResponse.json(await getFederalSeasonReadiness(dataSource, session, cycleId))
    }
    if (PROGRAM_DOMAINS.has(domain as FederalProgramDomain)) return NextResponse.json(await listFederalProgramDomain(dataSource, session, domain as FederalProgramDomain))
    return NextResponse.json({ error: 'Domaine inconnu' }, { status: 404 })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { domain } = await params
  const permission = permissionFor(domain, true)
  if (!permission) return NextResponse.json({ error: 'Domaine inconnu' }, { status: 404 })
  try {
    const dataSource = await getDataSource()
    await assertRegulatoryPermission(dataSource, session, permission)
    const body = await request.json() as Record<string, unknown>
    const createBody = domain === 'broadcasting'
      ? { ...body, allocations: normalizeBroadcastingAllocations(body.allocations) }
      : body
    await assertFederalOperationCreateReferences(dataSource, domain, createBody)
    const audit = auditContext(request, session)
    if (domain === 'commissions') return NextResponse.json(await createFederalCommission(dataSource, session, audit, createBody), { status: 201 })
    if (domain === 'insurance') return NextResponse.json(await createInsurancePolicy(dataSource, session, audit, createBody), { status: 201 })
    if (domain === 'grants') return NextResponse.json(await createFederationGrant(dataSource, session, audit, createBody), { status: 201 })
    if (domain === 'broadcasting') return NextResponse.json(await createBroadcastingDistribution(dataSource, session, audit, createBody), { status: 201 })
    if (domain === 'training-compensation') return NextResponse.json(await createTrainingCompensationCase(dataSource, session, audit, createBody), { status: 201 })
    if (domain === 'solidarity') return NextResponse.json(await createSolidarityContribution(dataSource, session, audit, createBody), { status: 201 })
    if (domain === 'documents') return NextResponse.json(await createDocumentRequirement(dataSource, session, audit, createBody), { status: 201 })
    if (domain === 'national-teams') return NextResponse.json(await createNationalTeam(dataSource, session, audit, createBody), { status: 201 })
    if (domain === 'season-cycle') return NextResponse.json(await prepareFederalSeasonOperations(dataSource, session, audit, String(createBody.cycleId ?? ''), createBody as unknown as Parameters<typeof prepareFederalSeasonOperations>[4]))
    return NextResponse.json({ error: 'Domaine inconnu' }, { status: 404 })
  } catch (error) {
    return handleError(error)
  }
}
