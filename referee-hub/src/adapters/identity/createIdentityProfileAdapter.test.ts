import { afterEach, describe, expect, it } from 'vitest'
import { IdentityHttpClient } from '../../../../packages/identity-client/src/index'
import { SharedDatabaseIdentityProfileAdapter } from './SharedDatabaseIdentityProfileAdapter'
import { createIdentityProfileAdapter } from './createIdentityProfileAdapter'

const originalUrl = process.env.IDENTITY_SERVICE_URL
const originalKey = process.env.IDENTITY_SERVICE_API_KEY

afterEach(() => {
  if (originalUrl === undefined) delete process.env.IDENTITY_SERVICE_URL
  else process.env.IDENTITY_SERVICE_URL = originalUrl
  if (originalKey === undefined) delete process.env.IDENTITY_SERVICE_API_KEY
  else process.env.IDENTITY_SERVICE_API_KEY = originalKey
})

describe('Identity profile adapter composition', () => {
  it('keeps shared-db during the transition when HTTP is not configured', () => {
    delete process.env.IDENTITY_SERVICE_URL
    delete process.env.IDENTITY_SERVICE_API_KEY

    expect(createIdentityProfileAdapter()).toBeInstanceOf(SharedDatabaseIdentityProfileAdapter)
  })

  it('uses Identity over HTTP when both service variables are configured', () => {
    process.env.IDENTITY_SERVICE_URL = 'http://identity.test'
    process.env.IDENTITY_SERVICE_API_KEY = 'secret'

    expect(createIdentityProfileAdapter()).toBeInstanceOf(IdentityHttpClient)
  })

  it('fails closed on partial configuration', () => {
    process.env.IDENTITY_SERVICE_URL = 'http://identity.test'
    delete process.env.IDENTITY_SERVICE_API_KEY

    expect(() => createIdentityProfileAdapter()).toThrow(/configured together/)
  })
})
