import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { createTestDataSource } from '@/test/testDataSource'
import { seedBaseGraph } from '@/test/fixtures'
import type { RefereeAvailabilityPort } from '../../../packages/domain-contracts/src/referee-availability'

let dataSource: DataSource

vi.mock('@/lib/db', () => ({
  getDataSource: async () => dataSource,
}))

const availableReferee: RefereeAvailabilityPort = {
  checkAvailability: async () => ({ available: true, blockingPeriod: null }),
}

beforeEach(async () => {
  dataSource = await createTestDataSource()
})

afterEach(async () => {
  await dataSource.destroy()
})

/** migration.md §11 (Phase 4): official match identity. */
describe('MatchOfficialAssignmentService', () => {
  describe('assign / findActiveAssignment', () => {
    it('has no active assignment for a user before one is created', async () => {
      const { MatchOfficialAssignmentService } = await import('./MatchOfficialAssignmentService')
      const { match } = await seedBaseGraph(dataSource)
      const service = new MatchOfficialAssignmentService(availableReferee)

      expect(await service.findActiveAssignment('referee-1', match.id)).toBeNull()
    })

    it('finds the active assignment once created', async () => {
      const { MatchOfficialAssignmentService } = await import('./MatchOfficialAssignmentService')
      const { match } = await seedBaseGraph(dataSource)
      const service = new MatchOfficialAssignmentService(availableReferee)

      await service.assign({
        matchId: match.id,
        userId: 'referee-1',
        role: 'CENTER_REFEREE',
        assignedBy: 'federation-admin@example.com',
      })

      const found = await service.findActiveAssignment('referee-1', match.id)
      expect(found).not.toBeNull()
      expect(found?.role).toBe('CENTER_REFEREE')
      expect(found?.status).toBe('ACTIVE')
    })

    it('does not authorize a user assigned to a different match', async () => {
      const { MatchOfficialAssignmentService } = await import('./MatchOfficialAssignmentService')
      const { match } = await seedBaseGraph(dataSource)
      const { match: otherMatch } = await seedBaseGraph(dataSource)
      const service = new MatchOfficialAssignmentService(availableReferee)

      await service.assign({ matchId: otherMatch.id, userId: 'referee-1', role: 'CENTER_REFEREE' })

      expect(await service.findActiveAssignment('referee-1', match.id)).toBeNull()
    })

    it('re-assigning the same user/role/match is idempotent', async () => {
      const { MatchOfficialAssignmentService } = await import('./MatchOfficialAssignmentService')
      const { match } = await seedBaseGraph(dataSource)
      const service = new MatchOfficialAssignmentService(availableReferee)

      const first = await service.assign({
        matchId: match.id,
        userId: 'referee-1',
        role: 'CENTER_REFEREE',
      })
      const second = await service.assign({
        matchId: match.id,
        userId: 'referee-1',
        role: 'CENTER_REFEREE',
      })

      expect(second.id).toBe(first.id)
      expect(await service.listForMatch(match.id)).toHaveLength(1)
    })

    it('allows two different officials to hold the same role', async () => {
      const { MatchOfficialAssignmentService } = await import('./MatchOfficialAssignmentService')
      const { match } = await seedBaseGraph(dataSource)
      const service = new MatchOfficialAssignmentService(availableReferee)

      await service.assign({ matchId: match.id, userId: 'assistant-1', role: 'ASSISTANT_REFEREE' })
      await service.assign({ matchId: match.id, userId: 'assistant-2', role: 'ASSISTANT_REFEREE' })

      expect(await service.listForMatch(match.id)).toHaveLength(2)
    })

    it('rejects an assignment when referee-hub reports the official unavailable', async () => {
      const { MatchOfficialAssignmentService, MatchOfficialAssignmentError } = await import(
        './MatchOfficialAssignmentService'
      )
      const { match } = await seedBaseGraph(dataSource)
      const unavailableReferee: RefereeAvailabilityPort = {
        checkAvailability: async ({ date }) => ({
          available: false,
          blockingPeriod: { startDate: date, endDate: date, reason: 'Congé' },
        }),
      }
      const service = new MatchOfficialAssignmentService(unavailableReferee)

      await expect(
        service.assign({
          matchId: match.id,
          userId: 'referee-1',
          role: 'CENTER_REFEREE',
        }),
      ).rejects.toThrow(MatchOfficialAssignmentError)
    })

    it('allows assignment when referee-hub reports the official available', async () => {
      const { MatchOfficialAssignmentService } = await import('./MatchOfficialAssignmentService')
      const { match } = await seedBaseGraph(dataSource)
      const service = new MatchOfficialAssignmentService(availableReferee)

      await expect(
        service.assign({
          matchId: match.id,
          userId: 'referee-1',
          role: 'CENTER_REFEREE',
        }),
      ).resolves.toMatchObject({ status: 'ACTIVE' })
    })
  })

  describe('revoke', () => {
    it('revokes an assignment without deleting it', async () => {
      const { MatchOfficialAssignmentService } = await import('./MatchOfficialAssignmentService')
      const { match } = await seedBaseGraph(dataSource)
      const service = new MatchOfficialAssignmentService(availableReferee)

      const assignment = await service.assign({
        matchId: match.id,
        userId: 'referee-1',
        role: 'CENTER_REFEREE',
      })
      const revoked = await service.revoke(assignment.id, 'federation-admin@example.com')

      expect(revoked.status).toBe('REVOKED')
      expect(revoked.revokedBy).toBe('federation-admin@example.com')
      expect(revoked.revokedAt).not.toBeNull()
      expect(await service.listForMatch(match.id)).toHaveLength(1)
      expect(await service.findActiveAssignment('referee-1', match.id)).toBeNull()
    })

    it('rejects revoking an already-revoked assignment', async () => {
      const { MatchOfficialAssignmentService, MatchOfficialAssignmentError } = await import(
        './MatchOfficialAssignmentService'
      )
      const { match } = await seedBaseGraph(dataSource)
      const service = new MatchOfficialAssignmentService(availableReferee)

      const assignment = await service.assign({
        matchId: match.id,
        userId: 'referee-1',
        role: 'CENTER_REFEREE',
      })
      await service.revoke(assignment.id)

      await expect(service.revoke(assignment.id)).rejects.toThrow(MatchOfficialAssignmentError)
    })

    it('a revoked official can be re-assigned to the same match', async () => {
      const { MatchOfficialAssignmentService } = await import('./MatchOfficialAssignmentService')
      const { match } = await seedBaseGraph(dataSource)
      const service = new MatchOfficialAssignmentService(availableReferee)

      const first = await service.assign({
        matchId: match.id,
        userId: 'referee-1',
        role: 'CENTER_REFEREE',
      })
      await service.revoke(first.id)

      const second = await service.assign({
        matchId: match.id,
        userId: 'referee-1',
        role: 'CENTER_REFEREE',
      })

      expect(second.id).not.toBe(first.id)
      expect(await service.findActiveAssignment('referee-1', match.id)).not.toBeNull()
    })
  })
})
