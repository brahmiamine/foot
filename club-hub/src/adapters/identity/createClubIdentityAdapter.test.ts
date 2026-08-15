import { afterEach, describe, expect, it } from 'vitest'
import { IdentityHttpClient } from '../../../../packages/identity-client/src/index'
import { SharedDatabaseClubIdentityAdapter } from './SharedDatabaseClubIdentityAdapter'
import { createClubIdentityAdapter } from './createClubIdentityAdapter'

const originalUrl = process.env.IDENTITY_SERVICE_URL
const originalKey = process.env.IDENTITY_SERVICE_API_KEY

afterEach(() => {
  if (originalUrl === undefined) delete process.env.IDENTITY_SERVICE_URL
  else process.env.IDENTITY_SERVICE_URL = originalUrl
  if (originalKey === undefined) delete process.env.IDENTITY_SERVICE_API_KEY
  else process.env.IDENTITY_SERVICE_API_KEY = originalKey
})

describe('Club Identity adapter composition', () => {
  it('keeps shared-db during transition when HTTP is not configured', () => {
    delete process.env.IDENTITY_SERVICE_URL
    delete process.env.IDENTITY_SERVICE_API_KEY

    expect(createClubIdentityAdapter()).toBeInstanceOf(SharedDatabaseClubIdentityAdapter)
  })

  it('uses Identity over HTTP when both variables are configured', () => {
    process.env.IDENTITY_SERVICE_URL = 'http://identity.test'
    process.env.IDENTITY_SERVICE_API_KEY = 'secret'

    expect(createClubIdentityAdapter()).toBeInstanceOf(IdentityHttpClient)
  })

  it('fails closed on partial configuration', () => {
    process.env.IDENTITY_SERVICE_URL = 'http://identity.test'
    delete process.env.IDENTITY_SERVICE_API_KEY

    expect(() => createClubIdentityAdapter()).toThrow(/configured together/)
  })
})
