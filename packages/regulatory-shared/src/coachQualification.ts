export const COACH_QUALIFICATION_TYPES = ["CAF_PRO", "CAF_A", "CAF_B", "CAF_C", "NATIONAL", "OTHER"] as const;
export type CoachQualificationType = (typeof COACH_QUALIFICATION_TYPES)[number];

/** Ordre croissant d'exigence, utilisé pour comparer un niveau détenu à un niveau minimum requis. */
const RANK: Record<CoachQualificationType, number> = { OTHER: 0, NATIONAL: 1, CAF_C: 2, CAF_B: 3, CAF_A: 4, CAF_PRO: 5 };

export const COACH_QUALIFICATION_STATUSES = ["PENDING", "VALID", "EXPIRED", "SUSPENDED", "REVOKED"] as const;
export type CoachQualificationStatus = (typeof COACH_QUALIFICATION_STATUSES)[number];

const TRANSITIONS: Record<CoachQualificationStatus, readonly CoachQualificationStatus[]> = {
  PENDING: ["VALID", "REVOKED"],
  VALID: ["EXPIRED", "SUSPENDED", "REVOKED"],
  EXPIRED: [],
  SUSPENDED: ["VALID", "REVOKED"],
  REVOKED: [],
};

export class CoachQualificationWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CoachQualificationWorkflowError";
  }
}

export function assertCoachQualificationTransition(from: CoachQualificationStatus, to: CoachQualificationStatus): void {
  if (!TRANSITIONS[from].includes(to)) throw new CoachQualificationWorkflowError(`Transition de qualification interdite : ${from} -> ${to}`);
}

export function isCoachQualificationActive(status: CoachQualificationStatus, expiresAt?: string | Date | null, now = new Date()): boolean {
  if (status !== "VALID") return false;
  if (!expiresAt) return true;
  return new Date(expiresAt) >= now;
}

export function meetsMinimumQualification(held: CoachQualificationType, minimum: CoachQualificationType): boolean {
  return RANK[held] >= RANK[minimum];
}
