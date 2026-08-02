import type { CritereDefinition } from '@/types'
import type { FormState } from './types'

export const defaultForm: FormState = {
  id: '',
  categorie: 'arbitre',
  label_fr: '',
  label_en: '',
  label_ar: '',
  description_fr: '',
  description_ar: '',
}

export const categorieLabels: Record<CritereDefinition['categorie'], string> = {
  arbitre: 'Arbitre central',
  var: 'VAR',
  assistant: 'Assistant',
}
