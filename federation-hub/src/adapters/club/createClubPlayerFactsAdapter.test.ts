import { afterEach, describe, expect, it } from 'vitest'
import { ClubHttpClient } from '../../../../packages/club-client/src/index'
import { SharedDatabaseClubPlayerFactsAdapter } from './SharedDatabaseClubPlayerFactsAdapter'
import { createClubPlayerFactsAdapter } from './createClubPlayerFactsAdapter'

const originalUrl = process.env.CLUB_HUB_URL
const originalKey = process.env.CLUB_HUB_SERVICE_API_KEY

afterEach(() => {
  if (originalUrl === undefined) delete process.env.CLUB_HUB_URL
  else process.env.CLUB_HUB_URL = originalUrl
  if (originalKey === undefined) delete process.env.CLUB_HUB_SERVICE_API_KEY
  else process.env.CLUB_HUB_SERVICE_API_KEY = originalKey
})

describe('Club player facts adapter composition', () => {
  it('keeps shared-db during transition when HTTP is not configured', () => {
    delete process.env.CLUB_HUB_URL
    delete process.env.CLUB_HUB_SERVICE_API_KEY
    expect(createClubPlayerFactsAdapter()).toBeInstanceOf(SharedDatabaseClubPlayerFactsAdapter)
  })

  it('uses club-hub over HTTP when both variables are configured', () => {
    process.env.CLUB_HUB_URL = 'http://club.test'
    process.env.CLUB_HUB_SERVICE_API_KEY = 'secret'
    expect(createClubPlayerFactsAdapter()).toBeInstanceOf(ClubHttpClient)
  })

  it('fails closed on partial configuration', () => {
    process.env.CLUB_HUB_URL = 'http://club.test'
    delete process.env.CLUB_HUB_SERVICE_API_KEY
    expect(() => createClubPlayerFactsAdapter()).toThrow(/configured together/)
  })
})
