import { afterEach, describe, expect, it } from 'vitest'
import { RefereeHttpClient } from '../../../../packages/referee-client/src/index'
import { SharedDatabaseRefereeAvailabilityDirectoryAdapter } from './SharedDatabaseRefereeAvailabilityDirectoryAdapter'
import { createRefereeAvailabilityDirectory } from './createRefereeAvailabilityDirectory'

const originalUrl = process.env.REFEREE_HUB_SERVICE_URL
const originalKey = process.env.REFEREE_HUB_SERVICE_API_KEY

afterEach(() => {
  if (originalUrl === undefined) delete process.env.REFEREE_HUB_SERVICE_URL
  else process.env.REFEREE_HUB_SERVICE_URL = originalUrl
  if (originalKey === undefined) delete process.env.REFEREE_HUB_SERVICE_API_KEY
  else process.env.REFEREE_HUB_SERVICE_API_KEY = originalKey
})

describe('referee availability directory composition', () => {
  it('uses shared-db during the transition when HTTP is not configured', () => {
    delete process.env.REFEREE_HUB_SERVICE_URL
    delete process.env.REFEREE_HUB_SERVICE_API_KEY

    expect(createRefereeAvailabilityDirectory()).toBeInstanceOf(
      SharedDatabaseRefereeAvailabilityDirectoryAdapter,
    )
  })

  it('uses referee-hub over HTTP when both variables are configured', () => {
    process.env.REFEREE_HUB_SERVICE_URL = 'http://referee.test'
    process.env.REFEREE_HUB_SERVICE_API_KEY = 'secret'

    expect(createRefereeAvailabilityDirectory()).toBeInstanceOf(RefereeHttpClient)
  })

  it('fails closed on partial configuration', () => {
    process.env.REFEREE_HUB_SERVICE_URL = 'http://referee.test'
    delete process.env.REFEREE_HUB_SERVICE_API_KEY

    expect(() => createRefereeAvailabilityDirectory()).toThrow(/configured together/)
  })
})
