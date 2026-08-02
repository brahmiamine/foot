import type { CritereDefinition } from '@/types'

export type FormState = {
  id: string
  categorie: CritereDefinition['categorie']
  label_fr: string
  label_en: string
  label_ar: string
  description_fr: string
  description_ar: string
}
