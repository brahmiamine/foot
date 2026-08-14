import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockSession = vi.fn()
const mockAnalytics = vi.fn()

vi.mock('@/lib/adminAuth', () => ({
  getOfficialEvalSession: (request: NextRequest) => mockSession(request),
}))
vi.mock('@/lib/refereeOfficialAnalytics', () => ({
  getRefereeOfficialAnalytics: (
    arbitreId: string,
    scope: { federationId?: string | null; leagueId?: string | null; observerUserId?: string | null },
  ) => mockAnalytics(arbitreId, scope),
}))

const { GET } = await import('./route')

beforeEach(() => {
  mockSession.mockReset()
  mockAnalytics.mockReset()
})

describe('GET /api/admin/arbitrage/evaluations/arbitres/:arbitreId/stats', () => {
  it('rejects requests without an official evaluation session', async () => {
    mockSession.mockResolvedValue(null)
    const response = await GET(
      new NextRequest('http://localhost/api/admin/arbitrage/evaluations/arbitres/ref-1/stats'),
      { params: Promise.resolve({ arbitreId: 'ref-1' }) },
    )
    expect(response.status).toBe(401)
    expect(mockAnalytics).not.toHaveBeenCalled()
  })

  it('returns validated official trend and observer comparison', async () => {
    mockSession.mockResolvedValue({
      id: 'fed-admin',
      role: 'FEDERATION_ADMIN',
      federationId: 'fed-1',
      leagueId: null,
    })
    mockAnalytics.mockResolvedValue({
      evaluationCount: 2,
      averageNoteOfficielle: 15.5,
      trend: [
        { evaluationId: 'e1', matchId: 'm1', date: '2026-08-01T00:00:00.000Z', note: 15, observerUserId: 'o1' },
        { evaluationId: 'e2', matchId: 'm2', date: '2026-08-08T00:00:00.000Z', note: 16, observerUserId: 'o2' },
      ],
      byObserver: [
        { observerUserId: 'o1', evaluationCount: 1, averageNote: 15 },
        { observerUserId: 'o2', evaluationCount: 1, averageNote: 16 },
      ],
      public: { voteCount: 8, averagePublicScore: 13.25 },
    })

    const response = await GET(
      new NextRequest('http://localhost/api/admin/arbitrage/evaluations/arbitres/ref-1/stats'),
      { params: Promise.resolve({ arbitreId: 'ref-1' }) },
    )
    expect(response.status).toBe(200)
    expect(mockAnalytics).toHaveBeenCalledWith('ref-1', {
      federationId: 'fed-1',
      observerUserId: null,
    })
    const body = await response.json()
    expect(body.trend).toHaveLength(2)
    expect(body.byObserver).toHaveLength(2)
    expect(body.averageNoteOfficielle).toBe(15.5)
    expect(body.public).toEqual({ voteCount: 8, averagePublicScore: 13.25 })
  })
})
