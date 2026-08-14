export const PLAYER_REGISTRATION_STATUSES = [
  "DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "SUSPENDED", "CANCELLED",
] as const;
export type PlayerRegistrationStatus = (typeof PLAYER_REGISTRATION_STATUSES)[number];

export const PLAYER_ELIGIBILITY_STATUSES = ["ELIGIBLE", "INELIGIBLE", "PENDING"] as const;
export type PlayerEligibilityStatus = (typeof PLAYER_ELIGIBILITY_STATUSES)[number];

const TRANSITIONS: Record<PlayerRegistrationStatus, readonly PlayerRegistrationStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["SUSPENDED", "CANCELLED"],
  REJECTED: ["DRAFT", "CANCELLED"],
  SUSPENDED: ["APPROVED", "CANCELLED"],
  CANCELLED: [],
};

export class PlayerRegistrationWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlayerRegistrationWorkflowError";
  }
}

export function assertPlayerRegistrationTransition(from: PlayerRegistrationStatus, to: PlayerRegistrationStatus): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new PlayerRegistrationWorkflowError(`Transition d'enregistrement joueur interdite : ${from} -> ${to}`);
  }
}

export function eligibilityForRegistrationStatus(status: PlayerRegistrationStatus): PlayerEligibilityStatus {
  if (status === "APPROVED") return "ELIGIBLE";
  if (["REJECTED", "SUSPENDED", "CANCELLED"].includes(status)) return "INELIGIBLE";
  return "PENDING";
}

export function isPlayerRegistrationEditable(status: PlayerRegistrationStatus): boolean {
  return status === "DRAFT";
}
