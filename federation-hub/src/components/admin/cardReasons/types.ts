export type CardReasonType = 'YELLOW' | 'RED' | 'BOTH'

export interface CardReason {
  id: string
  labelFr: string
  labelAr: string | null
  type: CardReasonType
  isActive: boolean
  createdAt: string
}

export interface CardReasonFormState {
  labelFr: string
  labelAr: string
  type: CardReasonType
  isActive: boolean
}

export const emptyForm: CardReasonFormState = {
  labelFr: '',
  labelAr: '',
  type: 'BOTH',
  isActive: true,
}

export const TYPE_LABELS: Record<CardReasonType, string> = {
  YELLOW: 'Jaune',
  RED: 'Rouge',
  BOTH: 'Jaune ou rouge',
}

export const TYPE_BADGES: Record<CardReasonType, string> = {
  YELLOW: 'bg-warning-subtle text-warning',
  RED: 'bg-danger-subtle text-danger',
  BOTH: 'bg-secondary-subtle text-secondary',
}
