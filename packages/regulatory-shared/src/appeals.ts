export const APPEAL_SOURCE_TYPES = ["LEGAL_CASE", "DISCIPLINARY_CASE", "CLUB_SANCTION", "CLUB_LICENSE", "PERSON_LICENSE", "STADIUM_INSPECTION", "COACH_QUALIFICATION", "FINANCIAL_COMPLIANCE", "MEDICAL_ELIGIBILITY", "OTHER"] as const;
export type AppealSourceType = (typeof APPEAL_SOURCE_TYPES)[number];

export const APPEAL_APPLICANT_TYPES = ["CLUB", "PLAYER", "COACH", "STAFF", "AGENT", "FEDERATION", "OTHER"] as const;
export type AppealApplicantType = (typeof APPEAL_APPLICANT_TYPES)[number];

export const APPEAL_STATUSES = ["SUBMITTED", "ADMISSIBILITY_REVIEW", "UNDER_REVIEW", "HEARING", "DECIDED", "REJECTED", "WITHDRAWN"] as const;
export type AppealStatus = (typeof APPEAL_STATUSES)[number];

const TRANSITIONS: Record<AppealStatus, readonly AppealStatus[]> = {
  SUBMITTED: ["ADMISSIBILITY_REVIEW", "WITHDRAWN"],
  ADMISSIBILITY_REVIEW: ["UNDER_REVIEW", "REJECTED", "WITHDRAWN"],
  UNDER_REVIEW: ["HEARING", "DECIDED", "WITHDRAWN"],
  HEARING: ["DECIDED", "WITHDRAWN"],
  DECIDED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export class AppealWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppealWorkflowError";
  }
}

export function assertAppealTransition(from: AppealStatus, to: AppealStatus): void {
  if (!TRANSITIONS[from].includes(to)) throw new AppealWorkflowError(`Transition d'appel interdite : ${from} -> ${to}`);
}
