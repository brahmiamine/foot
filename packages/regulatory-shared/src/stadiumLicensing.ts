export const STADIUM_ASPECT_STATUSES = ["OK", "ISSUES", "CRITICAL", "NOT_APPLICABLE"] as const;
export type StadiumAspectStatus = (typeof STADIUM_ASPECT_STATUSES)[number];

export const STADIUM_INSPECTION_STATUSES = ["PENDING", "APPROVED", "APPROVED_WITH_RESTRICTIONS", "REJECTED", "SUSPENDED", "EXPIRED"] as const;
export type StadiumInspectionStatus = (typeof STADIUM_INSPECTION_STATUSES)[number];

const TRANSITIONS: Record<StadiumInspectionStatus, readonly StadiumInspectionStatus[]> = {
  PENDING: ["APPROVED", "APPROVED_WITH_RESTRICTIONS", "REJECTED"],
  APPROVED: ["SUSPENDED", "EXPIRED"],
  APPROVED_WITH_RESTRICTIONS: ["SUSPENDED", "EXPIRED"],
  REJECTED: [],
  SUSPENDED: ["APPROVED", "APPROVED_WITH_RESTRICTIONS"],
  EXPIRED: [],
};

export class StadiumLicensingWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StadiumLicensingWorkflowError";
  }
}

export function assertStadiumInspectionTransition(from: StadiumInspectionStatus, to: StadiumInspectionStatus): void {
  if (!TRANSITIONS[from].includes(to)) throw new StadiumLicensingWorkflowError(`Transition d'homologation stade interdite : ${from} -> ${to}`);
}

export function isStadiumApproved(status: StadiumInspectionStatus, expiresAt?: string | Date | null, now = new Date()): boolean {
  if (status !== "APPROVED" && status !== "APPROVED_WITH_RESTRICTIONS") return false;
  if (!expiresAt) return true;
  return new Date(expiresAt) >= now;
}
