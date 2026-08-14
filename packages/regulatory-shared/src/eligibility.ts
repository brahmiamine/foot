export const ELIGIBILITY_BLOCKING_REASONS = [
  "NOT_MATCH_TEAM", "NO_ACTIVE_MEMBERSHIP", "NO_ACTIVE_LICENSE",
  "REGISTRATION_NOT_APPROVED", "CONTRACT_NOT_HOMOLOGATED", "ACTIVE_SUSPENSION",
  "TRANSFER_PENDING_OR_EFFECTIVE", "CLUB_NOT_REGISTERED", "MEDICAL_CLEARANCE_REQUIRED",
  "AGE_CATEGORY_MISMATCH",
] as const;
export type EligibilityBlockingReason = (typeof ELIGIBILITY_BLOCKING_REASONS)[number];
export interface EligibilityResult {
  eligible: boolean;
  blockingReasons: EligibilityBlockingReason[];
  warnings: string[];
}
export function eligibilityResult(blockingReasons: EligibilityBlockingReason[], warnings: string[] = []): EligibilityResult {
  return { eligible: blockingReasons.length === 0, blockingReasons: [...new Set(blockingReasons)], warnings };
}
export function ageAt(dateOfBirth: Date | string, at: Date): number {
  const birth = new Date(dateOfBirth);
  let age = at.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday = at.getUTCMonth() < birth.getUTCMonth() ||
    (at.getUTCMonth() === birth.getUTCMonth() && at.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}
export function fitsAgeCategory(category: string | null | undefined, birthDate: Date | string | null | undefined, at: Date): boolean {
  if (!category || category.toLowerCase() === "seniors" || !birthDate) return true;
  const match = /^u(\d{1,2})$/i.exec(category);
  return !match || ageAt(birthDate, at) < Number(match[1]);
}
