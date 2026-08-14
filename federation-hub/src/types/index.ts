/**
 * Types TypeScript pour l'application Federation Hub
 */

export interface Arbitre {
  id: string
  nom: string
  nom_fr?: string | null
  nom_en?: string | null
  nom_ar?: string | null
  nationalite?: string
  nationalite_ar?: string | null
  categorie?: string | null
  categorie_ar?: string | null
  photo_url?: string | null
  date_naissance?: string | null
  federation_id?: string | null
  league_id?: string | null
  grade?: string | null
  status?: string | null
  is_active?: boolean
  start_date?: string | null
  created_at?: string
  moyenne_note?: number
  nombre_votes?: number
}

export interface Federation {
  id: string
  code: string
  nom: string
  nom_en?: string | null
  nom_ar?: string | null
  logo_url?: string | null
  is_active?: boolean
}

export interface League {
  id: string
  federation_id: string
  nom: string
  nom_en?: string | null
  nom_ar?: string | null
  logo_url?: string | null
  is_active?: boolean
  federation?: Federation
}

export type TeamType = 'club' | 'national'
export type Sport = 'football' | 'handball' | 'basketball' | 'volleyball'
export type AgeCategory =
  | 'seniors'
  | 'u21' | 'u20' | 'u19' | 'u18' | 'u17' | 'u16' | 'u15' | 'u14' | 'u13'
  | 'u12' | 'u11' | 'u10' | 'u9' | 'u8' | 'u7'
export type Gender = 'male' | 'female' | 'mixed'

export interface Team {
  id: string
  nom: string
  nom_fr?: string | null
  nom_en?: string | null
  nom_ar?: string | null
  abbr?: string | null
  team_type?: TeamType
  country_code?: string | null
  sport?: Sport
  age_category?: AgeCategory
  gender?: Gender
  city?: string | null
  city_ar?: string | null
  city_en?: string | null
  stadium?: string | null
  stadium_ar?: string | null
  logo_url?: string | null
  created_at?: string
}

export interface Saison {
  id: string
  nom: string
  type_competition?: 'championnat' | 'coupe' | 'tournois'
  date_debut?: string | null
  date_fin?: string | null
  league_id?: string | null
  league?: League
  requiresPlayerContract?: boolean
  requiresStaffQualification?: boolean
}

export interface Journee {
  id: string
  numero?: number | null
  nom_fr?: string | null
  nom_en?: string | null
  nom_ar?: string | null
  saison_id: string
  date_journee?: string | null
  saison?: {
    id: string
    nom: string
    type_competition?: 'championnat' | 'coupe' | 'tournois'
    date_debut?: string | null
    date_fin?: string | null
    league_id?: string | null
    league?: {
      id: string
      nom: string
      federation_id?: string
      federation?: {
        id: string
        code: string
        nom: string
      }
    }
  }
}

export interface Match {
  id: string
  date: string | null
  journee_id: string
  equipe_home: Team
  equipe_away: Team
  score_home?: number | null
  score_away?: number | null
  arbitre_id?: string | null
  status?: 'UPCOMING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'
  journee?: {
    numero?: number | null
    nom?: string | null
    nom_en?: string | null
    nom_ar?: string | null
    saison_id: string
    date_journee?: string | null
  }
  created_at?: string
  arbitre?: Arbitre
  voteSummary?: MatchVoteSummary | null
  credibility?: number | null
  totalVotes?: number
}

export interface MatchVoteSummary {
  totalVotes: number
  globalAverage: number | null
  arbitreAverage: number | null
  varAverage: number | null
  assistantAverage: number | null
}

export type Criteres = Record<string, number>

export interface Vote {
  id: string
  match_id: string
  arbitre_id: string
  criteres: Criteres
  note_globale: number
  created_at?: string
  arbitre?: Arbitre
}

export interface ArbitreStats {
  arbitre: Arbitre
  stats: {
    nombre_votes: number
    moyenne_note: number
    moyenne_criteres: Criteres
  }
  votes: Vote[]
}

export type CritereCategory = 'arbitre' | 'var' | 'assistant'

export interface CritereDefinition {
  id: string
  categorie: CritereCategory
  label_fr: string
  label_en?: string | null
  label_ar: string
  description_fr?: string | null
  description_ar?: string | null
  created_at?: string
}
