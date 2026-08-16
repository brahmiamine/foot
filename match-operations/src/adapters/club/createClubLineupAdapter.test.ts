import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClubHttpClient } from '../../../../packages/club-client/src/index'
import { SharedDatabaseClubLineupAdapter } from './SharedDatabaseClubLineupAdapter'
import { createClubLineupAdapter } from './createClubLineupAdapter'

const originalUrl = process.env.CLUB_HUB_SERVICE_URL
const originalKey = process.env.CLUB_HUB_SERVICE_API_KEY
const originalRequireHttp = process.env.DOMAIN_BOUNDARY_REQUIRE_HTTP

afterEach(() => {
  vi.restoreAllMocks()
  if (originalUrl === undefined) delete process.env.CLUB_HUB_SERVICE_URL
  else process.env.CLUB_HUB_SERVICE_URL = originalUrl
  if (originalKey === undefined) delete process.env.CLUB_HUB_SERVICE_API_KEY
  else process.env.CLUB_HUB_SERVICE_API_KEY = originalKey
  if (originalRequireHttp === undefined) delete process.env.DOMAIN_BOUNDARY_REQUIRE_HTTP
  else process.env.DOMAIN_BOUNDARY_REQUIRE_HTTP = originalRequireHttp
})

describe('club lineup adapter composition', () => {
  it('keeps shared-db during transition and emits an observable warning', () => {
    delete process.env.CLUB_HUB_SERVICE_URL
    delete process.env.CLUB_HUB_SERVICE_API_KEY
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    expect(createClubLineupAdapter()).toBeInstanceOf(SharedDatabaseClubLineupAdapter)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('domain_boundary_adapter'))
  })

  it('uses club-hub when both service variables are configured', () => {
    process.env.CLUB_HUB_SERVICE_URL = 'http://club.test'
    process.env.CLUB_HUB_SERVICE_API_KEY = 'secret'
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    expect(createClubLineupAdapter()).toBeInstanceOf(ClubHttpClient)
  })

  it('fails closed on partial configuration', () => {
    process.env.CLUB_HUB_SERVICE_URL = 'http://club.test'
    delete process.env.CLUB_HUB_SERVICE_API_KEY
    expect(() => createClubLineupAdapter()).toThrow(/configured together/)
  })

  it('disables the shared-db fallback when HTTP boundaries are required', () => {
    delete process.env.CLUB_HUB_SERVICE_URL
    delete process.env.CLUB_HUB_SERVICE_API_KEY
    process.env.DOMAIN_BOUNDARY_REQUIRE_HTTP = 'true'
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => createClubLineupAdapter()).toThrow(/shared-db fallback is disabled/)
  })
})
