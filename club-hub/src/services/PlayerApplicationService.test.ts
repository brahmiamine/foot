import { beforeEach, describe, expect, it, vi } from 'vitest'

const assertEnabled = vi.fn()

const applications = new Map<number, Record<string, unknown>>()
const players = new Map<string, Record<string, unknown>>()
const events: Record<string, unknown>[] = []
let playerInsertCount = 0

const applicationRepository = {
  find: vi.fn(async () => Array.from(applications.values())),
  findOne: vi.fn(async ({ where }: { where: { id: number; teamId: string } }) => {
    const application = applications.get(Number(where.id))
    return application?.teamId === where.teamId ? application : null
  }),
  create: vi.fn((value: Record<string, unknown>) => value),
  save: vi.fn(async (value: Record<string, unknown>) => {
    applications.set(Number(value.id), value)
    return value
  }),
  remove: vi.fn(async (value: Record<string, unknown>) => {
    applications.delete(Number(value.id))
    return value
  }),
}

const playerRepository = {
  findOne: vi.fn(async ({ where }: { where: { id?: string; teamId: string } }) => {
    if (!where.id) return null
    const player = players.get(where.id)
    return player?.teamId === where.teamId ? player : null
  }),
  create: vi.fn((value: Record<string, unknown>) => value),
  save: vi.fn(async (value: Record<string, unknown>) => {
    playerInsertCount += 1
    players.set(String(value.id), value)
    return value
  }),
}

const eventRepository = {
  create: vi.fn((value: Record<string, unknown>) => value),
  save: vi.fn(async (value: Record<string, unknown>) => {
    events.push(value)
    return value
  }),
}

const manager = {
  getRepository: vi.fn((entity: { name: string }) => {
    if (entity.name === 'PlayerApplication') return applicationRepository
    if (entity.name === 'PlayerApplicationEvent') return eventRepository
    return playerRepository
  }),
}
type ManagerMock = typeof manager

const dataSource = {
  getRepository: vi.fn(() => applicationRepository),
  transaction: vi.fn(async (callback: (transactionManager: ManagerMock) => Promise<unknown>) => callback(manager)),
}

vi.mock('@/lib/database', () => ({ getDataSource: vi.fn(async () => dataSource) }))
vi.mock('./ClubFeatureSettingsService', () => ({
  ClubFeatureSettingsService: class {
    assertEnabled = assertEnabled
  },
}))

function seedApplication(overrides: Record<string, unknown> = {}) {
  const application = {
    id: 1,
    teamId: 'team-1',
    childLastName: 'Ben Salah',
    childFirstName: 'Youssef',
    birthDate: '2011-04-10',
    category: 'U15',
    position: 'MIDFIELDER',
    parentName: 'Parent',
    parentPhone: '+21600000000',
    parentEmail: 'parent@example.com',
    status: 'NEW',
    adminNotes: null,
    preScreeningNotes: null,
    preScreenedAt: null,
    preScreenedBy: null,
    trialScheduledAt: null,
    trialLocation: null,
    trialNotes: null,
    technicalApprovedAt: null,
    technicalApprovedBy: null,
    technicalNotes: null,
    administrativeApprovedAt: null,
    administrativeApprovedBy: null,
    administrativeNotes: null,
    rejectedAt: null,
    rejectedBy: null,
    rejectionReason: null,
    playerId: null,
    playerCreatedAt: null,
    playerCreatedBy: null,
    ...overrides,
  }
  applications.set(1, application)
  return application
}

beforeEach(() => {
  applications.clear()
  players.clear()
  events.length = 0
  playerInsertCount = 0
  assertEnabled.mockReset()
  applicationRepository.find.mockClear()
  applicationRepository.findOne.mockClear()
  applicationRepository.create.mockClear()
  applicationRepository.save.mockClear()
  applicationRepository.remove.mockClear()
  playerRepository.findOne.mockClear()
  playerRepository.create.mockClear()
  playerRepository.save.mockClear()
  eventRepository.create.mockClear()
  eventRepository.save.mockClear()
  dataSource.transaction.mockClear()
  manager.getRepository.mockClear()
})

describe('PlayerApplicationService academy workflow', () => {
  it('normalizes only supported internal Player categories', async () => {
    const { normalizeAcademyCategory } = await import('./PlayerApplicationService')
    expect(normalizeAcademyCategory('U15')).toBe('u15')
    expect(normalizeAcademyCategory(' u7 ')).toBe('u7')
    expect(normalizeAcademyCategory('U6')).toBeNull()
  })

  it('enforces pre-screening -> trial -> technical approval -> administrative approval', async () => {
    seedApplication()
    const { PlayerApplicationService } = await import('./PlayerApplicationService')
    const service = new PlayerApplicationService()

    await service.preScreen(1, 'team-1', 'technical-user', 'Profil cohérent')
    expect(applications.get(1)?.status).toBe('PRE_SCREENED')

    await service.scheduleTrial(1, 'team-1', 'technical-user', {
      scheduledAt: '2026-08-25T16:00:00.000Z',
      location: 'Terrain annexe',
      notes: 'Séance U15',
    })
    expect(applications.get(1)?.status).toBe('TRIAL_SCHEDULED')

    await service.approveTechnical(1, 'team-1', 'technical-user', 'Essai concluant')
    expect(applications.get(1)?.status).toBe('TECHNICAL_APPROVED')

    await service.approveAdministrative(1, 'team-1', 'admin-user', 'Dossier complet')
    expect(applications.get(1)?.status).toBe('ADMIN_APPROVED')
    expect(events).toHaveLength(4)
    expect(events.every((event) => event.teamId === 'team-1')).toBe(true)
    expect(events.map((event) => event.eventType)).toEqual([
      'PRE_SCREENED',
      'TRIAL_SCHEDULED',
      'TECHNICAL_APPROVED',
      'ADMIN_APPROVED',
    ])
  })

  it('refuses an administrative approval before technical approval', async () => {
    seedApplication({ status: 'TRIAL_SCHEDULED' })
    const { PlayerApplicationService } = await import('./PlayerApplicationService')

    await expect(
      new PlayerApplicationService().approveAdministrative(1, 'team-1', 'admin-user', 'Dossier complet'),
    ).rejects.toThrow('Transition de candidature invalide')
    expect(events).toHaveLength(0)
  })

  it('creates one linked Player only after administrative approval and is idempotent', async () => {
    seedApplication({ status: 'ADMIN_APPROVED' })
    const { PlayerApplicationService } = await import('./PlayerApplicationService')
    const service = new PlayerApplicationService()

    const first = await service.createPlayer(1, 'team-1', 'admin-user', {
      number: 24,
      category: 'u15',
      position: 'MIDFIELDER',
    })
    const application = applications.get(1)

    expect(first.teamId).toBe('team-1')
    expect(first.firstNameFr).toBe('Youssef')
    expect(first.lastNameFr).toBe('Ben Salah')
    expect(first.category).toBe('u15')
    expect(first.status).toBe('BLANK')
    expect(application?.status).toBe('PLAYER_CREATED')
    expect(application?.playerId).toBe(first.id)
    expect(playerInsertCount).toBe(1)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual(expect.objectContaining({
      teamId: 'team-1',
      eventType: 'PLAYER_CREATED',
      fromStatus: 'ADMIN_APPROVED',
      toStatus: 'PLAYER_CREATED',
    }))

    const second = await service.createPlayer(1, 'team-1', 'admin-user', {
      number: 24,
      category: 'u15',
      position: 'MIDFIELDER',
    })

    expect(second.id).toBe(first.id)
    expect(playerInsertCount).toBe(1)
    expect(events).toHaveLength(1)
  })

  it('never mutates an application belonging to another club', async () => {
    seedApplication({ teamId: 'team-2' })
    const { PlayerApplicationService } = await import('./PlayerApplicationService')

    await expect(
      new PlayerApplicationService().preScreen(1, 'team-1', 'technical-user', 'OK'),
    ).rejects.toThrow('Candidature introuvable')
    expect(events).toHaveLength(0)
  })

  it('requires a rejection reason and preserves processed applications from hard delete', async () => {
    seedApplication({ status: 'PRE_SCREENED' })
    const { PlayerApplicationService } = await import('./PlayerApplicationService')
    const service = new PlayerApplicationService()

    await expect(service.reject(1, 'team-1', 'admin-user', '   ')).rejects.toThrow('Motif de refus obligatoire')
    await expect(service.delete(1, 'team-1')).rejects.toThrow('Une candidature déjà traitée ne peut pas être supprimée')

    await service.reject(1, 'team-1', 'admin-user', 'Âge hors critères')
    expect(applications.get(1)?.status).toBe('REJECTED')
    expect(applications.get(1)?.rejectionReason).toBe('Âge hors critères')
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual(expect.objectContaining({ eventType: 'REJECTED', teamId: 'team-1' }))
  })
})
