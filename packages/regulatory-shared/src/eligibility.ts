import {
  ELIGIBILITY_BLOCKING_REASONS,
  type EligibilityBlockingReason,
  type EligibilityResult,
} from '../../domain-contracts/src/eligibility'

export { ELIGIBILITY_BLOCKING_REASONS }
export type { EligibilityBlockingReason, EligibilityResult }

export function eligibilityResult(
  blockingReasons: EligibilityBlockingReason[],
  warnings: string[] = [],
): EligibilityResult {
  return {
    eligible: blockingReasons.length === 0,
    blockingReasons: [...new Set(blockingReasons)],
    warnings,
  }
}

export function ageAt(dateOfBirth: Date | string, at: Date): number {
  const birth = new Date(dateOfBirth)
  let age = at.getUTCFullYear() - birth.getUTCFullYear()
  const beforeBirthday =
    at.getUTCMonth() < birth.getUTCMonth() ||
    (at.getUTCMonth() === birth.getUTCMonth() && at.getUTCDate() < birth.getUTCDate())
  if (beforeBirthday) age -= 1
  return age
}

export function fitsAgeCategory(
  category: string | null | undefined,
  birthDate: Date | string | null | undefined,
  at: Date,
): boolean {
  if (!category || category.toLowerCase() === 'seniors' || !birthDate) return true
  const match = /^u(\d{1,2})$/i.exec(category)
  return !match || ageAt(birthDate, at) < Number(match[1])
}
