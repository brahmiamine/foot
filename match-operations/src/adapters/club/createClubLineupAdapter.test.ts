import { afterEach, describe, expect, it } from 'vitest'
import { ClubHttpClient } from '../../../../packages/club-client/src/index'
import { SharedDatabaseClubLineupAdapter } from './SharedDatabaseClubLineupAdapter'
import { createClubLineupAdapter } from './createClubLineupAdapter'

const originalUrl = process.env.CLUB_HUB_SERVICE_URL
const originalKey = process.env.CLUB_HUB_SERVICE_API_KEY

afterEach(() => {
  if (originalUrl === undefined) delete process.env.CLUB_HUB_SERVICE_URL
  else process.env.CLUB_HUB_SERVICE_URL = originalUrl
  if (originalKey === undefined) delete process.env.CLUB_HUB_SERVICE_API_KEY
  else process.env.CLUB_HUB_SERVICE_API_KEY = originalKey
})

describe('club lineup adapter composition', () => {
  it('keeps shared-db during the transition when HTTP is not configured', () => {
    delete process.env.CLUB_HUB_SERVICE_URL
    delete process.env.CLUB_HUB_SERVICE_API_KEY

    expect(createClubLineupAdapter()).toBeInstanceOf(SharedDatabaseClubLineupAdapter)
  })

  it('uses club-hub when both service variables are configured', () => {
    process.env.CLUB_HUB_SERVICE_URL = 'http://club.test'
    process.env.CLUB_HUB_SERVICE_API_KEY = 'secret'

    expect(createClubLineupAdapter()).toBeInstanceOf(ClubHttpClient)
  })

  it('fails closed on partial configuration', () => {
    process.env.CLUB_HUB_SERVICE_URL = 'http://club.test'
    delete process.env.CLUB_HUB_SERVICE_API_KEY

    expect(() => createClubLineupAdapter()).toThrow(/configured together/)
  })
})
