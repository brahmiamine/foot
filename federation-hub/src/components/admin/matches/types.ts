export type MatchEdit = {
  score_home: string
  score_away: string
  date: string
  arbitre_id: string
  equipe_home: string
  equipe_away: string
}

export type NewMatchForm = {
  journee_id: string
  equipe_home: string
  equipe_away: string
  date: string
  score_home: string
  score_away: string
  arbitre_id: string
}

export type SaisonOption = {
  id: string
  nom: string
  leagueNom: string
}
