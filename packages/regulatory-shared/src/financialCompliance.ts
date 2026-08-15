export const FINANCIAL_COMPLIANCE_STATUSES = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "COMPLIANT", "CONDITIONAL", "NON_COMPLIANT"] as const;
export type FinancialComplianceStatus = (typeof FINANCIAL_COMPLIANCE_STATUSES)[number];

const TRANSITIONS: Record<FinancialComplianceStatus, readonly FinancialComplianceStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "DRAFT"],
  UNDER_REVIEW: ["COMPLIANT", "CONDITIONAL", "NON_COMPLIANT"],
  COMPLIANT: [],
  CONDITIONAL: [],
  NON_COMPLIANT: ["DRAFT"],
};

export class FinancialComplianceWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinancialComplianceWorkflowError";
  }
}

export function assertFinancialComplianceTransition(from: FinancialComplianceStatus, to: FinancialComplianceStatus): void {
  if (!TRANSITIONS[from].includes(to)) throw new FinancialComplianceWorkflowError(`Transition de conformité financière interdite : ${from} -> ${to}`);
}

export function canEditFinancialCompliance(status: FinancialComplianceStatus): boolean {
  return status === "DRAFT" || status === "NON_COMPLIANT";
}

/** Un club dont le dernier dossier de la saison est COMPLIANT ou CONDITIONAL est considéré en règle financièrement (CONDITIONAL = autorisé sous réserve). */
export function isFinanciallyCompliant(status: FinancialComplianceStatus): boolean {
  return status === "COMPLIANT" || status === "CONDITIONAL";
}
