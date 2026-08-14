export const CLUB_LICENSE_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "EXPIRED",
] as const;

export type ClubLicenseStatus = (typeof CLUB_LICENSE_STATUSES)[number];

export const CLUB_LICENSE_REQUIREMENT_CATEGORIES = [
  "SPORTING",
  "INFRASTRUCTURE",
  "ADMINISTRATIVE",
  "LEGAL",
  "PERSONNEL",
  "MEDICAL",
  "FINANCIAL",
] as const;

export type ClubLicenseRequirementCategory =
  (typeof CLUB_LICENSE_REQUIREMENT_CATEGORIES)[number];

export const CLUB_LICENSE_REQUIREMENT_STATUSES = [
  "PENDING",
  "COMPLIANT",
  "NON_COMPLIANT",
  "WAIVED",
] as const;

export type ClubLicenseRequirementStatus =
  (typeof CLUB_LICENSE_REQUIREMENT_STATUSES)[number];

const TRANSITIONS: Record<ClubLicenseStatus, readonly ClubLicenseStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["CHANGES_REQUESTED", "APPROVED", "REJECTED"],
  CHANGES_REQUESTED: ["SUBMITTED"],
  APPROVED: ["SUSPENDED", "EXPIRED"],
  REJECTED: [],
  SUSPENDED: ["APPROVED", "EXPIRED"],
  EXPIRED: [],
};

export class ClubLicenseWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClubLicenseWorkflowError";
  }
}

export function assertClubLicenseTransition(
  from: ClubLicenseStatus,
  to: ClubLicenseStatus,
): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new ClubLicenseWorkflowError(
      `Transition de licence club interdite : ${from} -> ${to}`,
    );
  }
}

export interface RequirementDecision {
  mandatory: boolean;
  status: ClubLicenseRequirementStatus;
  waiverReason?: string | null;
}

export function assertRequirementsAllowApproval(
  requirements: readonly RequirementDecision[],
): void {
  const blocking = requirements.filter(
    (requirement) =>
      requirement.mandatory &&
      requirement.status !== "COMPLIANT" &&
      requirement.status !== "WAIVED",
  );
  if (blocking.length > 0) {
    throw new ClubLicenseWorkflowError(
      `${blocking.length} exigence(s) obligatoire(s) ne permettent pas l'approbation`,
    );
  }

  const invalidWaiver = requirements.some(
    (requirement) =>
      requirement.status === "WAIVED" && !requirement.waiverReason?.trim(),
  );
  if (invalidWaiver) {
    throw new ClubLicenseWorkflowError(
      "Toute dérogation doit comporter un motif explicite",
    );
  }
}

export function isClubEditableStatus(status: ClubLicenseStatus): boolean {
  return status === "DRAFT" || status === "CHANGES_REQUESTED";
}
