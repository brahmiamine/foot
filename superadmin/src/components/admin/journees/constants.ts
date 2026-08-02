import type { Journee, Saison } from '@/types'
import type { JourneeForm } from './types'

export function toDateInputValue(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function buildForm(journee: Journee): JourneeForm {
  return {
    saison_id: journee.saison_id || '',
    numero: String(journee.numero || ''),
    nom_fr: journee.nom_fr || '',
    nom_en: journee.nom_en || '',
    nom_ar: journee.nom_ar || '',
    date_journee: toDateInputValue(journee.date_journee),
  }
}

export const emptyForm: JourneeForm = {
  saison_id: '',
  numero: '',
  nom_fr: '',
  nom_en: '',
  nom_ar: '',
  date_journee: '',
}

export function getSaisonDisplayName(saison: Saison): string {
  const leagueName = saison.league?.nom || 'Sans ligue'
  return `${leagueName} (${saison.nom})`
}
