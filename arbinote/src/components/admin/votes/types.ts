export interface Vote {
  id: string
  note_globale: number
  criteres: Record<string, number>
  created_at: string
  device_fingerprint?: string
  ip_address?: string
  match: {
    id: string
    date: string
    score_home?: number
    score_away?: number
    equipe_home: { id: string; nom: string }
    equipe_away: { id: string; nom: string }
    journee: {
      id: string
      numero?: number
      nom?: string
      saison: { id: string; nom: string }
    }
  }
  arbitre: {
    id: string
    nom: string
    photo_url?: string
  }
}

export interface FilterOptions {
  matches: Array<{
    id: string
    date: string
    equipe_home: { nom: string }
    equipe_away: { nom: string }
    journee?: { numero?: number; nom?: string }
    vote_count?: number
  }>
  arbitres: Array<{ id: string; nom: string }>
  journees: Array<{ id: string; numero?: number; nom?: string }>
}

export interface EditModalData {
  vote: Vote
  criteres: Record<string, number>
}
