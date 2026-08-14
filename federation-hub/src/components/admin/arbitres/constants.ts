import type { ArbitreFormState } from './types'

export const emptyForm: ArbitreFormState = {
  nom: '',
  nom_en: '',
  nom_ar: '',
  date_naissance: '',
  photoFile: null,
  photo_url: '',
  federation_id: '',
  league_id: '',
  categorie: '',
  grade: '',
  status: 'ACTIVE',
  is_active: true,
  start_date: '',
}
