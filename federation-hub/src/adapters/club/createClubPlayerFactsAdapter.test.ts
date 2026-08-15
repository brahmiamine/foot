import { afterEach, describe, expect, it } from 'vitest'
import { ClubHttpClient } from '../../../../packages/club-client/src/index'
import { SharedDatabaseClubPlayerFactsAdapter } from './SharedDatabaseClubPlayerFactsAdapter'
import { createClubPlayerFactsAdapter } from './createClubPlayerFactsAdapter'

const originalFactsUrl = process.env.CLUB_PLAYER_FACTS_URL
const originalFactsKey = process.env.CLUB_PLAYER_FACTS_SERVICE_API_KEY
const originalSagaUrl = process.env.CLUB_HUB_URL
const originalSagaKey = process.env.CLUB_HUB_SERVICE_API_KEY

afterEach(() => {
  if (originalFactsUrl === undefined) delete process.env.CLUB_PLAYER_FACTS_URL
  else process.env.CLUB_PLAYER_FACTS_URL = originalFactsUrl
  if (originalFactsKey === undefined) delete process.env.CLUB_PLAYER_FACTS_SERVICE_API_KEY
  else process.env.CLUB_PLAYER_FACTS_SERVICE_API_KEY = originalFactsKey
  if (originalSagaUrl === undefined) delete process.env.CLUB_HUB_URL
  else process.env.CLUB_HUB_URL = originalSagaUrl
  if (originalSagaKey === undefined) delete process.env.CLUB_HUB_SERVICE_API_KEY
  else process.env.CLUB_HUB_SERVICE_API_KEY = originalSagaKey
})

describe('Club player facts adapter composition', () => {
  it('keeps shared-db during transition when the dedicated boundary is not configured', () => {
    delete process.env.CLUB_PLAYER_FACTS_URL
    delete process.env.CLUB_PLAYER_FACTS_SERVICE_API_KEY
    process.env.CLUB_HUB_URL = 'http://club-saga.test'
    process.env.CLUB_HUB_SERVICE_API_KEY = 'saga-key'

    expect(createClubPlayerFactsAdapter()).toBeInstanceOf(SharedDatabaseClubPlayerFactsAdapter)
  })

  it('uses club-hub over HTTP when both dedicated variables are configured', () => {
    process.env.CLUB_PLAYER_FACTS_URL = 'http://club.test'
    process.env.CLUB_PLAYER_FACTS_SERVICE_API_KEY = 'secret'

    expect(createClubPlayerFactsAdapter()).toBeInstanceOf(ClubHttpClient)
  })

  it('fails closed on partial dedicated configuration', () => {
    process.env.CLUB_PLAYER_FACTS_URL = 'http://club.test'
    delete process.env.CLUB_PLAYER_FACTS_SERVICE_API_KEY

    expect(() => createClubPlayerFactsAdapter()).toThrow(/configured together/)
  })
})
