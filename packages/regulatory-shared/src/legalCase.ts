export const LEGAL_CASE_CATEGORIES = ["PLAYER_CLUB", "COACH_CLUB", "STAFF_CLUB", "AGENT_PLAYER", "AGENT_CLUB", "CLUB_CLUB", "CONTRACT", "TRANSFER", "DISCIPLINARY", "FINANCIAL", "OTHER"] as const;
export type LegalCaseCategory = (typeof LEGAL_CASE_CATEGORIES)[number];

export const LEGAL_CASE_PARTY_TYPES = ["CLUB", "PLAYER", "COACH", "STAFF", "AGENT", "FEDERATION", "OTHER"] as const;
export type LegalCasePartyType = (typeof LEGAL_CASE_PARTY_TYPES)[number];

export const LEGAL_CASE_STATUSES = ["FILED", "ADMISSIBILITY_REVIEW", "INADMISSIBLE", "UNDER_REVIEW", "HEARING_SCHEDULED", "HEARD", "DECIDED", "APPEALED", "CLOSED", "WITHDRAWN"] as const;
export type LegalCaseStatus = (typeof LEGAL_CASE_STATUSES)[number];

const TRANSITIONS: Record<LegalCaseStatus, readonly LegalCaseStatus[]> = {
  FILED: ["ADMISSIBILITY_REVIEW", "WITHDRAWN"],
  ADMISSIBILITY_REVIEW: ["INADMISSIBLE", "UNDER_REVIEW", "WITHDRAWN"],
  INADMISSIBLE: ["CLOSED"],
  UNDER_REVIEW: ["HEARING_SCHEDULED", "DECIDED", "WITHDRAWN"],
  HEARING_SCHEDULED: ["HEARD", "WITHDRAWN"],
  HEARD: ["DECIDED"],
  DECIDED: ["APPEALED", "CLOSED"],
  APPEALED: ["CLOSED"],
  CLOSED: [],
  WITHDRAWN: [],
};

const TERMINAL_STATUSES: readonly LegalCaseStatus[] = ["INADMISSIBLE", "CLOSED", "WITHDRAWN"];

export class LegalCaseWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LegalCaseWorkflowError";
  }
}

export function assertLegalCaseTransition(from: LegalCaseStatus, to: LegalCaseStatus): void {
  if (!TRANSITIONS[from].includes(to)) throw new LegalCaseWorkflowError(`Transition de litige interdite : ${from} -> ${to}`);
}

export function isLegalCaseOpen(status: LegalCaseStatus): boolean {
  return !TERMINAL_STATUSES.includes(status) && status !== "DECIDED";
}

export function isLegalCaseParty(partyType: LegalCasePartyType, partyId: string, clubId: string): boolean {
  return partyType === "CLUB" && partyId === clubId;
}

/** Numéro de dossier lisible, unique en base par contrainte SQL (retry laissé à l'appelant en cas de collision). */
export function formatLegalCaseNumber(year: number, sequence: number): string {
  return `LC-${year}-${String(sequence).padStart(5, "0")}`;
}
