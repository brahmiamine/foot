import type { TeamType, Sport, AgeCategory, Gender } from '@/types'

export interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: string[]
}

export interface TeamFormState {
  nom: string
  nom_en: string
  nom_ar: string
  abbr: string
  team_type: TeamType
  country_code: string
  sport: Sport
  age_category: AgeCategory
  gender: Gender
  city: string
  city_en: string
  city_ar: string
  stadium: string
  stadium_ar: string
  logo_url: string
}

export interface FilterOptions {
  team_types: TeamType[]
  sports: Sport[]
  age_categories: AgeCategory[]
  genders: Gender[]
  countries: string[]
}
