import type { TeamType, Sport, AgeCategory, Gender } from '@/types'
import type { TeamFormState } from './types'

export const emptyForm: TeamFormState = {
  nom: '',
  nom_en: '',
  nom_ar: '',
  abbr: '',
  team_type: 'club',
  country_code: '',
  sport: 'football',
  age_category: 'seniors',
  gender: 'male',
  city: '',
  city_en: '',
  city_ar: '',
  stadium: '',
  stadium_ar: '',
  logo_url: '',
}

export const TEAM_TYPE_LABELS: Record<TeamType, string> = {
  club: 'Club',
  national: 'Sélection nationale',
}

export const SPORT_LABELS: Record<Sport, string> = {
  football: 'Football',
  handball: 'Handball',
  basketball: 'Basketball',
  volleyball: 'Volleyball',
}

export const AGE_CATEGORY_LABELS: Record<AgeCategory, string> = {
  seniors: 'Seniors',
  u21: 'U21',
  u20: 'U20',
  u19: 'U19',
  u18: 'U18',
  u17: 'U17',
  u16: 'U16',
  u15: 'U15',
  u14: 'U14',
  u13: 'U13',
  u12: 'U12',
  u11: 'U11',
  u10: 'U10',
  u9: 'U9',
  u8: 'U8',
  u7: 'U7',
}

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Masculin',
  female: 'Féminin',
  mixed: 'Mixte',
}

export const COUNTRY_LABELS: Record<string, string> = {
  TUN: 'Tunisie',
  ALG: 'Algérie',
  MAR: 'Maroc',
  EGY: 'Égypte',
  FRA: 'France',
  ESP: 'Espagne',
  ITA: 'Italie',
  GER: 'Allemagne',
  ENG: 'Angleterre',
  SAU: 'Arabie Saoudite',
  UAE: 'Émirats Arabes Unis',
  QAT: 'Qatar',
  LBY: 'Libye',
}

export function getCountryLabel(code: string | null | undefined): string {
  if (!code) return '—'
  return COUNTRY_LABELS[code] || code
}
