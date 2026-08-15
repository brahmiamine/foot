export interface RefereeAvailabilityCheckRequest {
  userId: string
  /** ISO calendar date (YYYY-MM-DD) in the match scheduling timezone. */
  date: string
}

export interface RefereeUnavailabilityPeriod {
  startDate: string
  endDate: string
  reason?: string | null
}

export interface RefereeAvailabilityResult {
  available: boolean
  blockingPeriod?: RefereeUnavailabilityPeriod | null
}

export interface RefereeAvailabilityBatchRequest {
  userIds: string[]
  /** ISO calendar date (YYYY-MM-DD) in the match scheduling timezone. */
  date: string
}

export interface RefereeAvailabilityBatchResult {
  availabilityByUser: Record<string, RefereeAvailabilityResult>
}

/**
 * Port owned by the referee domain and consumed by match assignment workflows.
 * Consumers do not need to know where referee unavailability is persisted.
 */
export interface RefereeAvailabilityPort {
  checkAvailability(input: RefereeAvailabilityCheckRequest): Promise<RefereeAvailabilityResult>
}

/** Batch read used by federation selectors to avoid one HTTP call per official. */
export interface RefereeAvailabilityDirectoryPort {
  checkAvailabilityBatch(
    input: RefereeAvailabilityBatchRequest,
  ): Promise<RefereeAvailabilityBatchResult>
}
