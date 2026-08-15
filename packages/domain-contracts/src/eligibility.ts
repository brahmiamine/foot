export const ELIGIBILITY_BLOCKING_REASONS = [
  'NOT_MATCH_TEAM',
  'NO_ACTIVE_MEMBERSHIP',
  'NO_ACTIVE_LICENSE',
  'REGISTRATION_NOT_APPROVED',
  'CONTRACT_NOT_HOMOLOGATED',
  'ACTIVE_SUSPENSION',
  'TRANSFER_PENDING_OR_EFFECTIVE',
  'CLUB_NOT_REGISTERED',
  'MEDICAL_CLEARANCE_REQUIRED',
  'AGE_CATEGORY_MISMATCH',
] as const

export type EligibilityBlockingReason = (typeof ELIGIBILITY_BLOCKING_REASONS)[number]

export interface EligibilityCheckRequest {
  playerId: string
  clubId: string
  matchId: string
  seasonId?: string
}

export interface EligibilityContext {
  actorUserId?: string | null
  actorRole?: string
  ipAddress?: string | null
  userAgent?: string | null
  correlationId?: string | null
}

export interface EligibilityResult {
  eligible: boolean
  blockingReasons: EligibilityBlockingReason[]
  warnings: string[]
}

export interface EligibilityServicePort {
  checkPlayerEligibility(
    input: EligibilityCheckRequest,
    context?: EligibilityContext,
  ): Promise<EligibilityResult>
}
