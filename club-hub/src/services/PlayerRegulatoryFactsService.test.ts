import { beforeEach, describe, expect, it, vi } from 'vitest'

const query = vi.fn()
vi.mock('@/lib/database', () => ({
  getDataSource: async () => ({ query }),
}))

beforeEach(() => {
  query.mockReset()
})

describe('PlayerRegulatoryFactsService', () => {
  it('returns membership, suspension and birth date without exposing storage details', async () => {
    query
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ birthDate: '2006-04-10' }])

    const { PlayerRegulatoryFactsService } = await import('./PlayerRegulatoryFactsService')
    const result = await new PlayerRegulatoryFactsService().getPlayerRegulatoryFacts({
      playerId: 'player-1',
      clubId: 'club-1',
      at: '2026-08-15T14:00:00.000Z',
    })

    expect(result).toEqual({
      hasActiveMembership: true,
      hasActiveSuspension: true,
      birthDate: '2006-04-10',
    })
    expect(query).toHaveBeenCalledTimes(3)
  })

  it('returns false/null when no blocking Club fact exists', async () => {
    query
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([])

    const { PlayerRegulatoryFactsService } = await import('./PlayerRegulatoryFactsService')
    await expect(
      new PlayerRegulatoryFactsService().getPlayerRegulatoryFacts({
        playerId: 'player-1',
        clubId: 'club-1',
        at: '2026-08-15',
      }),
    ).resolves.toEqual({
      hasActiveMembership: false,
      hasActiveSuspension: false,
      birthDate: null,
    })
  })

  it('rejects an invalid reference date', async () => {
    const { PlayerRegulatoryFactsService } = await import('./PlayerRegulatoryFactsService')
    await expect(
      new PlayerRegulatoryFactsService().getPlayerRegulatoryFacts({
        playerId: 'player-1',
        clubId: 'club-1',
        at: 'not-a-date',
      }),
    ).rejects.toThrow('Date de référence invalide')
    expect(query).not.toHaveBeenCalled()
  })
})
