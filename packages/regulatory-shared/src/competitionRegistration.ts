export const COMPETITION_REGISTRATION_STATUSES = [
  "DRAFT", "SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED",
  "APPROVED", "REJECTED", "WITHDRAWN", "SUSPENDED",
] as const;
export type CompetitionRegistrationStatus = (typeof COMPETITION_REGISTRATION_STATUSES)[number];

const TRANSITIONS: Record<CompetitionRegistrationStatus, readonly CompetitionRegistrationStatus[]> = {
  DRAFT: ["SUBMITTED", "WITHDRAWN"],
  SUBMITTED: ["UNDER_REVIEW", "WITHDRAWN"],
  UNDER_REVIEW: ["CHANGES_REQUESTED", "APPROVED", "REJECTED"],
  CHANGES_REQUESTED: ["SUBMITTED", "WITHDRAWN"],
  APPROVED: ["SUSPENDED", "WITHDRAWN"],
  REJECTED: ["DRAFT", "WITHDRAWN"],
  WITHDRAWN: [],
  SUSPENDED: ["APPROVED", "WITHDRAWN"],
};

export class CompetitionRegistrationWorkflowError extends Error {
  constructor(message: string) { super(message); this.name = "CompetitionRegistrationWorkflowError"; }
}

export function assertCompetitionRegistrationTransition(
  from: CompetitionRegistrationStatus,
  to: CompetitionRegistrationStatus,
): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new CompetitionRegistrationWorkflowError(`Transition d'engagement interdite : ${from} -> ${to}`);
  }
}

export function assertCompetitionRegistrationApproval(input: {
  clubLicenseApproved: boolean;
  clubLicenseExpiresAt?: Date | string | null;
  documentsComplete: boolean;
  participationBlocked: boolean;
  stadiumRequired: boolean;
  stadiumApprovalId?: string | null;
  financialComplianceRequired: boolean;
  financialComplianceId?: string | null;
  feesAmount?: string | number | null;
  feesPaymentId?: string | null;
}, at = new Date()): void {
  if (!input.clubLicenseApproved || (input.clubLicenseExpiresAt && new Date(input.clubLicenseExpiresAt) < at)) {
    throw new CompetitionRegistrationWorkflowError("Une licence club valide est obligatoire");
  }
  if (input.participationBlocked) throw new CompetitionRegistrationWorkflowError("Le club fait l'objet d'une interdiction de participation");
  if (!input.documentsComplete) throw new CompetitionRegistrationWorkflowError("Le dossier d'engagement est incomplet");
  if (input.stadiumRequired && !input.stadiumApprovalId) throw new CompetitionRegistrationWorkflowError("Une homologation de stade est obligatoire");
  if (input.financialComplianceRequired && !input.financialComplianceId) throw new CompetitionRegistrationWorkflowError("La conformité financière est obligatoire");
  if (Number(input.feesAmount ?? 0) > 0 && !input.feesPaymentId) throw new CompetitionRegistrationWorkflowError("Les droits d'engagement ne sont pas réglés");
}
