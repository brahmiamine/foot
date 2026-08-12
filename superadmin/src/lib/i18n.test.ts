import { describe, expect, it } from 'vitest'
import fr from '@/locales/fr.json'
import ar from '@/locales/ar.json'
import { getDirection, interpolate, isLocale } from './i18nShared'

describe('catalogues SuperAdmin', () => {
  it('maintient une parité exacte entre le français et l’arabe', () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(fr).sort())
    expect(Object.values(fr).every(Boolean)).toBe(true)
    expect(Object.values(ar).every(Boolean)).toBe(true)
  })

  it('ne prend en charge que les locales produit et change la direction', () => {
    expect(isLocale('fr')).toBe(true)
    expect(getDirection('fr')).toBe('ltr')
    expect(isLocale('ar')).toBe(true)
    expect(getDirection('ar')).toBe('rtl')
    expect(isLocale('en')).toBe(false)
  })

  it('interpole tous les paramètres sans effacer ceux qui manquent', () => {
    expect(interpolate('Bonjour {{ name }}, #{{count}}', { name: 'Samir', count: 2 })).toBe('Bonjour Samir, #2')
    expect(interpolate('{{missing}}')).toBe('{{missing}}')
  })
})
