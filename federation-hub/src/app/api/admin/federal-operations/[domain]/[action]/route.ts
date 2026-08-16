import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { addFederalCommissionMember, createFederalCommissionDecision, createFederalCommissionSession, markFederalCommissionDecisionNotified, recordFederalCommissionAttendance, signFederalCommissionDecision, transitionFederalCommissionSession } from '@/lib/federalCommissions'
import { FederalOperationAuthorizationError, FederalOperationInputError, loadScopedRow } from '@/lib/federalOperationsCommon'
import { FederalOperationWorkflowError } from '@/lib/federalOperationsRules'
import { approveBroadcastingDistribution, createGrantApplication, decideSolidarityContribution, decideTrainingCompensationCase, recordGrantPayment, reviewRegulatoryDocument, submitRegulatoryDocument, transitionFederationGrant, transitionGrantApplication, transitionInsurancePolicy } from '@/lib/federalPrograms'
import { assertSafeRegulatoryDocumentUrl } from '@/lib/federalProgramViews'
import { finalizeFederalSeasonOperations } from '@/lib/federalSeasonOperations'
import { createNationalTeamCallup, createNationalTeamEvent, listNationalTeamCallups, listNationalTeamEvents, transitionNationalTeamCallup, transitionNationalTeamEvent } from '@/lib/nationalTeams'
import { assertRegulatoryPermission, RegulatoryPermissionError, type RegulatoryPermission } from '@/lib/regulatoryPermissions'

export const runtime = 'nodejs'
type Context = { params: Promise<{ domain: string; action: string }> }

function auditContext(request: NextRequest, session: { id: string; role: string }) {
  return { userId: session.id, role: session.role, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: request.headers.get('user-agent') }
}

function permissionFor(domain: string, action: string): RegulatoryPermission | null {
  if (domain === 'commissions') return ['decision', 'sign', 'notify'].includes(action) ? 'commission.decide' : 'commission.manage'
  if (domain === 'insurance') return 'insurance.review'
  if (domain === 'grants') return ['application-transition', 'payment'].includes(action) ? 'grant.review' : 'grant.manage'
  if (domain === 'broadcasting') return 'broadcasting.manage'
  if (domain === 'training-compensation') return action === 'decision' ? 'training_compensation.decide' : 'training_compensation.manage'
  if (domain === 'solidarity') return action === 'decision' ? 'solidarity.decide' : 'solidarity.manage'
  if (domain === 'documents') return 'document_compliance.review'
  if (domain === 'national-teams') return 'national_team.manage'
  if (domain === 'season-cycle') return 'season_cycle.manage'
  return null
}

function handleError(error: unknown) {
  if (error instanceof RegulatoryPermissionError || error instanceof FederalOperationAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
  if (error instanceof FederalOperationInputError) return NextResponse.json({ error: error.message }, { status: 400 })
  if (error instanceof FederalOperationWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
  console.error('Unexpected federal operations action API error:', error)
  return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
}

export async function GET(request: NextRequest, { params }: Context) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { domain, action } = await params
  try {
    const dataSource = await getDataSource()
    if (domain !== 'national-teams' || !['events', 'callups'].includes(action)) return NextResponse.json({ error: 'Action inconnue' }, { status: 404 })
    await assertRegulatoryPermission(dataSource, session, 'national_team.view')
    const teamId = new URL(request.url).searchParams.get('nationalTeamId')
    if (!teamId) return NextResponse.json({ error: 'nationalTeamId requis' }, { status: 400 })
    return NextResponse.json(action === 'events' ? await listNationalTeamEvents(dataSource, session, teamId) : await listNationalTeamCallups(dataSource, session, teamId))
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { domain, action } = await params
  const permission = permissionFor(domain, action)
  if (!permission) return NextResponse.json({ error: 'Action inconnue' }, { status: 404 })
  try {
    const dataSource = await getDataSource()
    await assertRegulatoryPermission(dataSource, session, permission)
    const body = await request.json() as Record<string, unknown>
    const audit = auditContext(request, session)

    if (domain === 'commissions') {
      if (action === 'member') return NextResponse.json(await addFederalCommissionMember(dataSource, session, audit, String(body.commissionId ?? ''), body), { status: 201 })
      if (action === 'session') return NextResponse.json(await createFederalCommissionSession(dataSource, session, audit, String(body.commissionId ?? ''), body), { status: 201 })
      if (action === 'attendance') return NextResponse.json(await recordFederalCommissionAttendance(dataSource, session, audit, String(body.sessionId ?? ''), String(body.memberId ?? ''), body.status))
      if (action === 'transition') return NextResponse.json(await transitionFederalCommissionSession(dataSource, session, audit, String(body.sessionId ?? ''), body.targetStatus, typeof body.reason === 'string' ? body.reason : null))
      if (action === 'decision') return NextResponse.json(await createFederalCommissionDecision(dataSource, session, audit, String(body.sessionId ?? ''), body), { status: 201 })
      if (action === 'sign') return NextResponse.json(await signFederalCommissionDecision(dataSource, session, audit, String(body.decisionId ?? '')))
      if (action === 'notify') return NextResponse.json(await markFederalCommissionDecisionNotified(dataSource, session, audit, String(body.decisionId ?? '')))
    }

    if (domain === 'insurance' && action === 'transition') return NextResponse.json(await transitionInsurancePolicy(dataSource, session, audit, body.policyScope === 'PERSON' ? 'PERSON' : 'CLUB', String(body.id ?? ''), body.targetStatus, typeof body.comment === 'string' ? body.comment : null))

    if (domain === 'grants') {
      if (action === 'campaign-transition') return NextResponse.json(await transitionFederationGrant(dataSource, session, audit, String(body.id ?? ''), body.targetStatus))
      if (action === 'application') {
        const grantId = String(body.grantId ?? '')
        const grant = await loadScopedRow<{ id: string; federation_id: string; league_id: string | null; status: string }>(dataSource, session, 'federation_grants', grantId)
        if (grant.status !== 'OPEN') throw new FederalOperationWorkflowError('La campagne de subvention doit être ouverte')
        return NextResponse.json(await createGrantApplication(dataSource, session, audit, grantId, body), { status: 201 })
      }
      if (action === 'application-transition') return NextResponse.json(await transitionGrantApplication(dataSource, session, audit, String(body.id ?? ''), body.targetStatus, body.approvedAmount, typeof body.comment === 'string' ? body.comment : null))
      if (action === 'payment') return NextResponse.json(await recordGrantPayment(dataSource, session, audit, String(body.applicationId ?? ''), body), { status: 201 })
    }

    if (domain === 'broadcasting' && action === 'approve') return NextResponse.json(await approveBroadcastingDistribution(dataSource, session, audit, String(body.id ?? '')))
    if (domain === 'training-compensation' && action === 'decision') return NextResponse.json(await decideTrainingCompensationCase(dataSource, session, audit, String(body.id ?? ''), typeof body.rationale === 'string' ? body.rationale : null))
    if (domain === 'solidarity' && action === 'decision') return NextResponse.json(await decideSolidarityContribution(dataSource, session, audit, String(body.id ?? '')))

    if (domain === 'documents') {
      if (action === 'submit') return NextResponse.json(await submitRegulatoryDocument(dataSource, session, audit, String(body.requirementId ?? ''), { ...body, fileUrl: assertSafeRegulatoryDocumentUrl(body.fileUrl) }), { status: 201 })
      if (action === 'review') return NextResponse.json(await reviewRegulatoryDocument(dataSource, session, audit, String(body.id ?? ''), body.status, typeof body.comment === 'string' ? body.comment : null))
    }

    if (domain === 'national-teams') {
      if (action === 'event') return NextResponse.json(await createNationalTeamEvent(dataSource, session, audit, String(body.nationalTeamId ?? ''), body), { status: 201 })
      if (action === 'event-transition') return NextResponse.json(await transitionNationalTeamEvent(dataSource, session, audit, String(body.eventId ?? ''), body.targetStatus))
      if (action === 'callup') return NextResponse.json(await createNationalTeamCallup(dataSource, session, audit, String(body.nationalTeamId ?? ''), body), { status: 201 })
      if (action === 'callup-transition') return NextResponse.json(await transitionNationalTeamCallup(dataSource, session, audit, String(body.callupId ?? ''), body.targetStatus, typeof body.reason === 'string' ? body.reason : null))
    }

    if (domain === 'season-cycle' && action === 'finalize') return NextResponse.json(await finalizeFederalSeasonOperations(dataSource, session, audit, String(body.cycleId ?? '')))
    return NextResponse.json({ error: 'Action inconnue' }, { status: 404 })
  } catch (error) {
    return handleError(error)
  }
}
