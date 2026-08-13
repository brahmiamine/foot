import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { seedBaseGraph } from '@/test/fixtures'
import { Match, Vote } from '@/lib/entities'

let dataSource: DataSource

vi.mock('@/lib/db', () => ({
  getDataSource: async () => dataSource,
}))

const mockVerifySsoTokenWithRevocation = vi.fn()
vi.mock('../../../../../packages/auth-shared/src/session', () => ({
  getSsoCookieName: () => 'foot_sso_session',
  verifySsoTokenWithRevocation: (...args: unknown[]) => mockVerifySsoTokenWithRevocation(...args),
}))

beforeEach(async () => {
  dataSource = await createTestDataSource()
  mockVerifySsoTokenWithRevocation.mockReset()
  mockVerifySsoTokenWithRevocation.mockResolvedValue(null)
  process.env.FINGERPRINT_PROOF_SECRET = 'test-secret'
})

afterEach(async () => {
  await dataSource.destroy()
})

function buildRequest(body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/votes', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.5', ...headers },
    body: JSON.stringify(body),
  })
}

async function seedVotableMatch() {
  const graph = await seedBaseGraph(dataSource)
  await dataSource.getRepository(Match).update(graph.match.id, { status: 'FINISHED' })
  return graph
}

/** TASK-P0-022 : vote anonyme (consentement requis) vs vote authentifié (userId). */
describe('POST /api/votes', () => {
  describe('vote anonyme', () => {
    it('refuse un vote anonyme sans consentement', async () => {
      const { match, arbitre } = await seedVotableMatch()
      const { POST } = await import('./route')

      const response = await POST(
        buildRequest({
          match_id: match.id,
          arbitre_id: arbitre.id,
          criteres: { decisions_cles: 4 },
          device_fingerprint: 'fp-1',
        }),
      )

      expect(response.status).toBe(400)
    })

    it('accepte un vote anonyme avec consentement, sans user_id', async () => {
      const { match, arbitre } = await seedVotableMatch()
      const { POST } = await import('./route')

      const response = await POST(
        buildRequest({
          match_id: match.id,
          arbitre_id: arbitre.id,
          criteres: { decisions_cles: 4 },
          device_fingerprint: 'fp-1',
          consent: true,
        }),
      )

      expect(response.status).toBe(201)
      const saved = await dataSource.getRepository(Vote).findOneOrFail({ where: { match_id: match.id } })
      expect(saved.device_fingerprint).toBe('fp-1')
      expect(saved.user_id ?? null).toBeNull()
    })

    it('refuse un second vote anonyme avec le même fingerprint pour le même match', async () => {
      const { match, arbitre } = await seedVotableMatch()
      const { POST } = await import('./route')
      const payload = {
        match_id: match.id,
        arbitre_id: arbitre.id,
        criteres: { decisions_cles: 4 },
        device_fingerprint: 'fp-dup',
        consent: true,
      }

      const first = await POST(buildRequest(payload))
      expect(first.status).toBe(201)

      const second = await POST(buildRequest(payload))
      expect(second.status).toBe(409)
    })
  })

  describe('vote authentifié', () => {
    it("accepte un vote authentifié sans exiger de consentement ni de fingerprint", async () => {
      const { match, arbitre } = await seedVotableMatch()
      mockVerifySsoTokenWithRevocation.mockResolvedValue({
        id: 'user-1',
        email: 'membre@example.com',
        name: 'Membre',
        role: 'MEMBER',
        teamId: null,
      })
      const { POST } = await import('./route')

      const response = await POST(
        buildRequest(
          { match_id: match.id, arbitre_id: arbitre.id, criteres: { decisions_cles: 4 } },
          { cookie: 'foot_sso_session=valid-token' },
        ),
      )

      expect(response.status).toBe(201)
      const saved = await dataSource.getRepository(Vote).findOneOrFail({ where: { match_id: match.id } })
      expect(saved.user_id).toBe('user-1')
    })

    it('refuse un second vote authentifié du même utilisateur pour le même match', async () => {
      const { match, arbitre } = await seedVotableMatch()
      mockVerifySsoTokenWithRevocation.mockResolvedValue({
        id: 'user-1',
        email: 'membre@example.com',
        name: 'Membre',
        role: 'MEMBER',
        teamId: null,
      })
      const { POST } = await import('./route')
      const request = () =>
        buildRequest(
          { match_id: match.id, arbitre_id: arbitre.id, criteres: { decisions_cles: 4 } },
          { cookie: 'foot_sso_session=valid-token' },
        )

      const first = await POST(request())
      expect(first.status).toBe(201)

      const second = await POST(request())
      expect(second.status).toBe(409)
    })

    it('un rôle non-MEMBER (ex: ADMIN) retombe sur le flux anonyme (consentement requis)', async () => {
      const { match, arbitre } = await seedVotableMatch()
      mockVerifySsoTokenWithRevocation.mockResolvedValue({
        id: 'staff-1',
        email: 'staff@example.com',
        name: 'Staff',
        role: 'ADMIN',
        teamId: null,
      })
      const { POST } = await import('./route')

      const response = await POST(
        buildRequest(
          { match_id: match.id, arbitre_id: arbitre.id, criteres: { decisions_cles: 4 }, device_fingerprint: 'fp-1' },
          { cookie: 'foot_sso_session=valid-token' },
        ),
      )

      // Pas de consent -> toujours 400, la session ADMIN n'accorde pas le mode authentifié membre.
      expect(response.status).toBe(400)
    })

    it('deux utilisateurs authentifiés différents depuis le même appareil/IP peuvent tous deux voter', async () => {
      const { match, arbitre } = await seedVotableMatch()
      const { POST } = await import('./route')

      mockVerifySsoTokenWithRevocation.mockResolvedValue({
        id: 'user-1',
        email: 'a@example.com',
        name: 'A',
        role: 'MEMBER',
        teamId: null,
      })
      const first = await POST(
        buildRequest(
          { match_id: match.id, arbitre_id: arbitre.id, criteres: { decisions_cles: 4 } },
          { cookie: 'foot_sso_session=token-a' },
        ),
      )
      expect(first.status).toBe(201)

      mockVerifySsoTokenWithRevocation.mockResolvedValue({
        id: 'user-2',
        email: 'b@example.com',
        name: 'B',
        role: 'MEMBER',
        teamId: null,
      })
      const second = await POST(
        buildRequest(
          { match_id: match.id, arbitre_id: arbitre.id, criteres: { decisions_cles: 4 } },
          { cookie: 'foot_sso_session=token-b' },
        ),
      )
      expect(second.status).toBe(201)
    })
  })
})
