import { describe, expect, it } from 'vitest'
import { getSuperadminDocumentAttributes } from './federationHubLocale'

describe('federation-hub locale document attributes', () => {
  it('produces an Arabic RTL document for the Arabic cookie', () => {
    expect(getSuperadminDocumentAttributes('ar')).toEqual({ lang: 'ar', dir: 'rtl' })
  })

  it.each([undefined, 'en', 'invalid'])('falls back to French for %s', (cookieValue) => {
    expect(getSuperadminDocumentAttributes(cookieValue)).toEqual({ lang: 'fr', dir: 'ltr' })
  })
})
