import type { SaisonFormState } from './types'

export const emptyForm: SaisonFormState = {
  nom: '',
  type_competition: 'championnat',
  date_debut: '',
  date_fin: '',
  league_id: '',
}

export function toDateInputValue(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
