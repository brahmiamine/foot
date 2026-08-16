import { afterEach, describe, expect, it } from 'vitest'
import { RegulatoryHttpClient } from '../../../../packages/regulatory-client/src/index'
import { SharedDatabaseEligibilityAdapter } from './SharedDatabaseEligibilityAdapter'
import { SharedDatabaseStaffQualificationAdapter } from './SharedDatabaseStaffQualificationAdapter'
import {
  createPlayerEligibilityPort,
  createStaffQualificationPort,
} from './createRegulatoryAdapters'

const originalUrl = process.env.FEDERATION_REGULATORY_URL
const originalKey = process.env.FEDERATION_REGULATORY_SERVICE_API_KEY

afterEach(() => {
  if (originalUrl === undefined) delete process.env.FEDERATION_REGULATORY_URL
  else process.env.FEDERATION_REGULATORY_URL = originalUrl
  if (originalKey === undefined) delete process.env.FEDERATION_REGULATORY_SERVICE_API_KEY
  else process.env.FEDERATION_REGULATORY_SERVICE_API_KEY = originalKey
})

describe('regulatory adapter composition', () => {
  it('keeps shared database adapters when HTTP is not configured', () => {
    delete process.env.FEDERATION_REGULATORY_URL
    delete process.env.FEDERATION_REGULATORY_SERVICE_API_KEY

    expect(createPlayerEligibilityPort()).toBeInstanceOf(SharedDatabaseEligibilityAdapter)
    expect(createStaffQualificationPort()).toBeInstanceOf(SharedDatabaseStaffQualificationAdapter)
  })

  it('uses the HTTP boundary when both service variables are configured', () => {
    process.env.FEDERATION_REGULATORY_URL = 'http://federation.test'
    process.env.FEDERATION_REGULATORY_SERVICE_API_KEY = 'secret'

    expect(createPlayerEligibilityPort()).toBeInstanceOf(RegulatoryHttpClient)
    expect(createStaffQualificationPort()).toBeInstanceOf(RegulatoryHttpClient)
  })

  it('fails closed on partial HTTP configuration', () => {
    process.env.FEDERATION_REGULATORY_URL = 'http://federation.test'
    delete process.env.FEDERATION_REGULATORY_SERVICE_API_KEY

    expect(() => createPlayerEligibilityPort()).toThrow(/configured together/)
  })
})
