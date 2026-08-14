export const PLAYER_CONTRACT_TYPES = ["PROFESSIONAL", "AMATEUR", "TRAINEE", "YOUTH", "OTHER"] as const;
export type PlayerContractType = (typeof PLAYER_CONTRACT_TYPES)[number];

export const PLAYER_CONTRACT_STATUSES = ["DRAFT", "SIGNED", "TERMINATED", "EXPIRED"] as const;
export type PlayerContractStatus = (typeof PLAYER_CONTRACT_STATUSES)[number];

export const PLAYER_CONTRACT_FEDERAL_STATUSES = ["NOT_SUBMITTED", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"] as const;
export type PlayerContractFederalStatus = (typeof PLAYER_CONTRACT_FEDERAL_STATUSES)[number];

const BUSINESS_TRANSITIONS: Record<PlayerContractStatus, readonly PlayerContractStatus[]> = {
  DRAFT: ["SIGNED"], SIGNED: ["TERMINATED", "EXPIRED"], TERMINATED: [], EXPIRED: [],
};
const FEDERAL_TRANSITIONS: Record<PlayerContractFederalStatus, readonly PlayerContractFederalStatus[]> = {
  NOT_SUBMITTED: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["CANCELLED"],
  REJECTED: ["NOT_SUBMITTED", "CANCELLED"],
  CANCELLED: [],
};

export class PlayerContractWorkflowError extends Error {
  constructor(message: string) { super(message); this.name = "PlayerContractWorkflowError"; }
}

export function assertPlayerContractTransition(from: PlayerContractStatus, to: PlayerContractStatus): void {
  if (!BUSINESS_TRANSITIONS[from].includes(to)) throw new PlayerContractWorkflowError(`Transition de contrat interdite : ${from} -> ${to}`);
}

export function assertPlayerContractFederalTransition(from: PlayerContractFederalStatus, to: PlayerContractFederalStatus): void {
  if (!FEDERAL_TRANSITIONS[from].includes(to)) throw new PlayerContractWorkflowError(`Transition fédérale de contrat interdite : ${from} -> ${to}`);
}

export function assertPlayerContractDates(startDate: string | Date, endDate: string | Date): void {
  const start = new Date(startDate); const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) throw new PlayerContractWorkflowError("La date de fin doit être postérieure ou égale à la date de début");
}

export function assertPlayerContractSubmittable(status: PlayerContractStatus, hasCurrentDocument: boolean): void {
  if (status !== "SIGNED") throw new PlayerContractWorkflowError("Le contrat doit être signé avant sa soumission");
  if (!hasCurrentDocument) throw new PlayerContractWorkflowError("Une version courante du contrat signé est obligatoire");
}

export function isPlayerContractHomologated(status: PlayerContractStatus, federalStatus: PlayerContractFederalStatus, endDate: string | Date, now = new Date()): boolean {
  const end = new Date(endDate); end.setHours(23, 59, 59, 999);
  return status === "SIGNED" && federalStatus === "APPROVED" && end >= now;
}

export function canEditPlayerContract(status: PlayerContractStatus, federalStatus: PlayerContractFederalStatus): boolean {
  return (status === "DRAFT" || status === "SIGNED") && federalStatus === "NOT_SUBMITTED";
}
