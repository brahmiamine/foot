import { describe, expect, it } from 'vitest'
import { isNextImageSafe } from './imageHost'

describe('isNextImageSafe', () => {
  it('rejects null, undefined and empty values', () => {
    expect(isNextImageSafe(null)).toBe(false)
    expect(isNextImageSafe(undefined)).toBe(false)
    expect(isNextImageSafe('')).toBe(false)
  })

  it('treats relative (same-origin) paths as always safe', () => {
    expect(isNextImageSafe('/uploads/logo.png')).toBe(true)
    expect(isNextImageSafe('/api/uploads/arbitre/photo.jpg')).toBe(true)
  })

  it('accepts allow-listed HTTPS hostnames', () => {
    expect(isNextImageSafe('https://static.flashscore.com/logo.png')).toBe(true)
    expect(isNextImageSafe('https://upload.wikimedia.org/wikipedia/commons/1/logo.png')).toBe(true)
    expect(isNextImageSafe('https://img.uefa.com/x.png')).toBe(true)
    expect(isNextImageSafe('https://crests.football-data.org/1.png')).toBe(true)
    expect(isNextImageSafe('https://media.api-sports.io/football/teams/1.png')).toBe(true)
  })

  it('accepts subdomain matches for suffix patterns', () => {
    expect(isNextImageSafe('https://fr.wikipedia.org/x.png')).toBe(true)
    expect(isNextImageSafe('https://cdn.gstatic.com/x.png')).toBe(true)
    expect(isNextImageSafe('https://media-4.api-sports.io/x.png')).toBe(true)
  })

  it('rejects hostnames that merely contain an allowed domain as a substring', () => {
    // This host is NOT a subdomain of wikipedia.org and must not match.
    expect(isNextImageSafe('https://notwikipedia.org.evil.com/x.png')).toBe(false)
    expect(isNextImageSafe('https://evil-wikipedia.org/x.png')).toBe(false)
  })

  it('rejects hosts that are not in the allow-list', () => {
    expect(isNextImageSafe('https://example.com/logo.png')).toBe(false)
    expect(isNextImageSafe('https://attacker.com/phish.png')).toBe(false)
  })

  it('rejects non-HTTPS protocols even for allowed hosts', () => {
    expect(isNextImageSafe('http://static.flashscore.com/logo.png')).toBe(false)
    expect(isNextImageSafe('ftp://static.flashscore.com/logo.png')).toBe(false)
  })

  it('rejects malformed URLs instead of throwing', () => {
    expect(isNextImageSafe('not a url')).toBe(false)
    expect(isNextImageSafe('://missing-protocol')).toBe(false)
  })
})
