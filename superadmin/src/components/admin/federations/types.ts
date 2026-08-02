export interface Federation {
  id: string
  code: string
  nom: string
  nom_en?: string | null
  nom_ar?: string | null
  logo_url?: string | null
  is_active?: boolean
  created_at?: string | null
}

export interface FederationFormState {
  code: string
  nom: string
  nom_en: string
  nom_ar: string
  logoFile: File | null
  logo_url: string
}
