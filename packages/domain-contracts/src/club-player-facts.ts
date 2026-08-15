export interface ClubPlayerRegulatoryFactsRequest {
  playerId: string
  clubId: string
  /** ISO date/datetime used to evaluate membership at the match date. */
  at: string
}

export interface ClubPlayerRegulatoryFacts {
  hasActiveMembership: boolean
  hasActiveSuspension: boolean
  birthDate: string | null
}

/**
 * Club-owned facts needed by federation regulatory decisions. The Club domain
 * exposes facts only; Federation remains responsible for the eligibility rule.
 */
export interface ClubPlayerRegulatoryFactsPort {
  getPlayerRegulatoryFacts(
    input: ClubPlayerRegulatoryFactsRequest,
  ): Promise<ClubPlayerRegulatoryFacts>
}
