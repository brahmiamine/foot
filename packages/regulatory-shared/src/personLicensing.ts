export const PERSON_LICENSE_TYPES = [
  "PLAYER",
  "COACH",
  "STAFF",
  "MEDICAL",
  "DIRECTOR",
  "REFEREE",
  "MATCH_OFFICIAL",
] as const;

export type PersonLicenseType = (typeof PERSON_LICENSE_TYPES)[number];

export const PERSON_LICENSE_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "EXPIRED",
  "REVOKED",
] as const;

export type PersonLicenseStatus = (typeof PERSON_LICENSE_STATUSES)[number];

const TRANSITIONS: Record<PersonLicenseStatus, readonly PersonLicenseStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["SUSPENDED", "EXPIRED", "REVOKED"],
  REJECTED: ["DRAFT"],
  SUSPENDED: ["APPROVED", "EXPIRED", "REVOKED"],
  EXPIRED: [],
  REVOKED: [],
};

export class PersonLicenseWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersonLicenseWorkflowError";
  }
}

export function assertPersonLicenseTransition(
  from: PersonLicenseStatus,
  to: PersonLicenseStatus,
): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new PersonLicenseWorkflowError(
      `Transition de licence individuelle interdite : ${from} -> ${to}`,
    );
  }
}

export function isPersonLicenseEditable(status: PersonLicenseStatus): boolean {
  return status === "DRAFT";
}

export function isPersonLicenseActive(
  status: PersonLicenseStatus,
  expiresAt?: Date | string | null,
  at = new Date(),
): boolean {
  if (status !== "APPROVED") return false;
  return !expiresAt || new Date(expiresAt).getTime() > at.getTime();
}

export function assertApprovalMetadata(input: {
  licenseNumber?: string | null;
  expiresAt?: Date | string | null;
}): void {
  if (!input.licenseNumber?.trim()) {
    throw new PersonLicenseWorkflowError(
      "Le numéro de licence est obligatoire pour l'approbation",
    );
  }
  if (input.expiresAt && Number.isNaN(new Date(input.expiresAt).getTime())) {
    throw new PersonLicenseWorkflowError("La date d'expiration est invalide");
  }
}
