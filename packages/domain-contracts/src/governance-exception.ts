export interface GovernanceExceptionRecord {
  id: string
  ruleKey: string
  targetType: string
  targetId: string
  reference: string
  reason: string
  validFrom: Date | string
  validUntil: Date | string
  revokedAt?: Date | string | null
}

export interface GovernanceExceptionMatch {
  ruleKey: string
  targetType: string
  targetId: string
  reference: string
}

function toMillis(value: Date | string): number {
  const date = value instanceof Date ? value : new Date(value)
  return date.getTime()
}

export function isGovernanceExceptionActive(
  record: GovernanceExceptionRecord,
  at: Date = new Date(),
): boolean {
  if (record.revokedAt) return false
  const atMs = at.getTime()
  const fromMs = toMillis(record.validFrom)
  const untilMs = toMillis(record.validUntil)
  if (!Number.isFinite(fromMs) || !Number.isFinite(untilMs)) return false
  return fromMs <= atMs && atMs < untilMs
}

export function matchesGovernanceException(
  record: GovernanceExceptionRecord,
  match: GovernanceExceptionMatch,
): boolean {
  return (
    record.ruleKey === match.ruleKey &&
    record.targetType === match.targetType &&
    record.targetId === match.targetId &&
    record.reference === match.reference
  )
}

export function assertGovernanceExceptionWindow(validFrom: Date, validUntil: Date): void {
  if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validUntil.getTime())) {
    throw new Error('Governance exception validity dates are invalid')
  }
  if (validUntil.getTime() <= validFrom.getTime()) {
    throw new Error('Governance exception validUntil must be after validFrom')
  }
}
