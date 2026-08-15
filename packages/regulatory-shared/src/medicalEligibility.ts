export const MEDICAL_ELIGIBILITY_STATUSES = ["PENDING", "FIT", "UNFIT", "EXPIRED", "SUSPENDED"] as const;
export type MedicalEligibilityStatus = (typeof MEDICAL_ELIGIBILITY_STATUSES)[number];

const TRANSITIONS: Record<MedicalEligibilityStatus, readonly MedicalEligibilityStatus[]> = {
  PENDING: ["FIT", "UNFIT"],
  FIT: ["EXPIRED", "SUSPENDED"],
  UNFIT: ["PENDING"],
  EXPIRED: [],
  SUSPENDED: ["FIT"],
};

export class MedicalEligibilityWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MedicalEligibilityWorkflowError";
  }
}

export function assertMedicalEligibilityTransition(from: MedicalEligibilityStatus, to: MedicalEligibilityStatus): void {
  if (!TRANSITIONS[from].includes(to)) throw new MedicalEligibilityWorkflowError(`Transition d'aptitude médicale interdite : ${from} -> ${to}`);
}

/** Aucun diagnostic n'est jamais représenté ici : seul FIT est éligible, et seulement si non expiré. */
export function isMedicallyEligible(status: MedicalEligibilityStatus, expiresAt?: string | Date | null, now = new Date()): boolean {
  if (status !== "FIT") return false;
  if (!expiresAt) return true;
  return new Date(expiresAt) >= now;
}
