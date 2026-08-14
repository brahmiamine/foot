export interface SaisonFormState {
  nom: string
  type_competition: 'championnat' | 'coupe' | 'tournois'
  date_debut: string
  date_fin: string
  league_id: string
  requiresPlayerContract: boolean
  requiresStaffQualification: boolean
}
