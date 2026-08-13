import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockCreate = vi.fn((value: unknown) => value)
const mockSave = vi.fn()
const mockGetRepository = vi.fn(() => ({ create: mockCreate, save: mockSave }))

vi.mock('./db', () => ({
  getDataSource: async () => ({ getRepository: mockGetRepository }),
}))
vi.mock('./utils', () => ({
  getClientIP: () => '203.0.113.10',
}))

const { logAdminAction } = await import('./auditLog')

beforeEach(() => {
  mockCreate.mockClear()
  mockSave.mockReset()
  mockGetRepository.mockClear()
})

describe('logAdminAction terminal audit', () => {
  it('stores IP and User-Agent for sensitive admin actions', async () => {
    const request = new NextRequest('http://localhost/api/admin/matches/m1/officials', {
      method: 'POST',
      headers: { 'user-agent': 'FootControl/1.0' },
    })

    await logAdminAction({
      request,
      action: 'create',
      entityType: 'match_official_assignment',
      entityId: 'assignment-1',
    })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: 'match_official_assignment',
        ip_address: '203.0.113.10',
        user_agent: 'FootControl/1.0',
      }),
    )
    expect(mockSave).toHaveBeenCalledOnce()
  })
})
