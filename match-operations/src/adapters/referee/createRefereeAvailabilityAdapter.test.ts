import { afterEach, describe, expect, it } from 'vitest'
import { RefereeHttpClient } from '../../../../packages/referee-client/src/index'
import { SharedDatabaseRefereeAvailabilityAdapter } from './SharedDatabaseRefereeAvailabilityAdapter'
import { createRefereeAvailabilityAdapter } from './createRefereeAvailabilityAdapter'

const originalUrl = process.env.REFEREE_HUB_URL
const originalKey = process.env.REFEREE_HUB_SERVICE_API_KEY

afterEach(() => {
  if (originalUrl === undefined) delete process.env.REFEREE_HUB_URL
  else process.env.REFEREE_HUB_URL = originalUrl
  if (originalKey === undefined) delete process.env.REFEREE_HUB_SERVICE_API_KEY
  else process.env.REFEREE_HUB_SERVICE_API_KEY = originalKey
})

describe('referee availability adapter composition', () => {
  it('keeps the shared database adapter when HTTP is not configured', () => {
    delete process.env.REFEREE_HUB_URL
    delete process.env.REFEREE_HUB_SERVICE_API_KEY

    expect(createRefereeAvailabilityAdapter()).toBeInstanceOf(
      SharedDatabaseRefereeAvailabilityAdapter,
    )
  })

  it('uses referee-hub when both service variables are configured', () => {
    process.env.REFEREE_HUB_URL = 'http://referee.test'
    process.env.REFEREE_HUB_SERVICE_API_KEY = 'secret'

    expect(createRefereeAvailabilityAdapter()).toBeInstanceOf(RefereeHttpClient)
  })

  it('fails closed on partial HTTP configuration', () => {
    process.env.REFEREE_HUB_URL = 'http://referee.test'
    delete process.env.REFEREE_HUB_SERVICE_API_KEY

    expect(() => createRefereeAvailabilityAdapter()).toThrow(/configured together/)
  })
})
