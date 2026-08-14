import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { seedBaseGraph } from '@/test/fixtures'
import type { SsoUser } from '@/lib/ssoSession'

let dataSource: DataSource

vi.mock('@/lib/db', () => ({
  getDataSource: async () => dataSource,
}))

const mockGetSsoSessionFromRequest = vi.fn<() => Promise<SsoUser | null>>()
vi.mock('@/lib/ssoSession', () => ({
  getSsoSession: vi.fn(),
  getSsoSessionFromRequest: () => mockGetSsoSessionFromRequest(),
  redirectToLogin: vi.fn(),
}))

const { POST } = await import('./route')

function session(overrides: Partial<SsoUser>): SsoUser {
  return {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin',
    role: 'FEDERATION_ADMIN',
    teamId: null,
    federationId: null,
    leagueId: null,
    ...overrides,
  }
}

function postRequest(evaluationId: string): NextRequest {
  return new NextRequest(`http://localhost/api/admin/arbitrage/evaluations/evaluations/${evaluationId}/validate`, { method: 'POST' })
}

beforeEach(async () => {
  dataSource = await createTestDataSource()
  mockGetSsoSessionFromRequest.mockReset()
})

afterEach(async () => {
  await dataSource.destroy()
})

describe('POST /api/admin/arbitrage/evaluations/evaluations/:id/validate — homologation dérivée de la fédération du match (migration.md §9/§12)', () => {
  it('rejects a REFEREE_OBSERVER (validation reserved to FEDERATION_ADMIN/PLATFORM_SUPERADMIN)', async () => {
    const { createEvaluation } = await import('@/lib/refereeOfficialEvaluations')
    const { match, arbitre } = await seedBaseGraph(dataSource)
    const evaluation = await createEvaluation({ matchId: match.id, arbitreId: arbitre.id, observerUserId: 'observer-1', criteres: {}, noteOfficielle: 7 })
    const { submitEvaluation } = await import('@/lib/refereeOfficialEvaluations')
    await submitEvaluation(evaluation.id)

    mockGetSsoSessionFromRequest.mockResolvedValue(session({ role: 'REFEREE_OBSERVER', id: 'observer-1' }))

    const response = await POST(postRequest(evaluation.id), { params: Promise.resolve({ id: evaluation.id }) })
    expect(response.status).toBe(403)
  })

  it('rejects a FEDERATION_ADMIN whose federation does not govern this match', async () => {
    const { createEvaluation, submitEvaluation } = await import('@/lib/refereeOfficialEvaluations')
    const { match, arbitre } = await seedBaseGraph(dataSource)
    const evaluation = await createEvaluation({ matchId: match.id, arbitreId: arbitre.id, observerUserId: 'observer-1', criteres: {}, noteOfficielle: 7 })
    await submitEvaluation(evaluation.id)

    mockGetSsoSessionFromRequest.mockResolvedValue(session({ role: 'FEDERATION_ADMIN', federationId: 'fed-other' }))

    const response = await POST(postRequest(evaluation.id), { params: Promise.resolve({ id: evaluation.id }) })
    expect(response.status).toBe(403)
  })

  it('allows the FEDERATION_ADMIN that governs this match', async () => {
    const { createEvaluation, submitEvaluation } = await import('@/lib/refereeOfficialEvaluations')
    const { match, arbitre, federation } = await seedBaseGraph(dataSource)
    const evaluation = await createEvaluation({ matchId: match.id, arbitreId: arbitre.id, observerUserId: 'observer-1', criteres: {}, noteOfficielle: 7 })
    await submitEvaluation(evaluation.id)

    mockGetSsoSessionFromRequest.mockResolvedValue(session({ role: 'FEDERATION_ADMIN', federationId: federation.id }))

    const response = await POST(postRequest(evaluation.id), { params: Promise.resolve({ id: evaluation.id }) })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.status).toBe('VALIDATED')
  })

  it('allows PLATFORM_SUPERADMIN regardless of federation', async () => {
    const { createEvaluation, submitEvaluation } = await import('@/lib/refereeOfficialEvaluations')
    const { match, arbitre } = await seedBaseGraph(dataSource)
    const evaluation = await createEvaluation({ matchId: match.id, arbitreId: arbitre.id, observerUserId: 'observer-1', criteres: {}, noteOfficielle: 7 })
    await submitEvaluation(evaluation.id)

    mockGetSsoSessionFromRequest.mockResolvedValue(session({ role: 'PLATFORM_SUPERADMIN' }))

    const response = await POST(postRequest(evaluation.id), { params: Promise.resolve({ id: evaluation.id }) })
    expect(response.status).toBe(200)
  })
})
