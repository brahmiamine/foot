export interface League {
  id: string
  federation_id: string
  nom: string
  nom_en?: string | null
  nom_ar?: string | null
  logo_url?: string | null
  is_active?: boolean
  created_at?: string | null
  federation?: {
    id: string
    nom: string
    code: string
  }
}

export interface Federation {
  id: string
  code: string
  nom: string
  is_active?: boolean
}

export interface LeagueFormState {
  federation_id: string
  nom: string
  nom_en: string
  nom_ar: string
  logoFile: File | null
  logo_url: string
}
