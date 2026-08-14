export const BOARD_MEMBER_ROLES = ["PRESIDENT", "VICE_PRESIDENT", "GENERAL_SECRETARY", "TREASURER", "BOARD_MEMBER", "OTHER"] as const;
export type BoardMemberRole = (typeof BOARD_MEMBER_ROLES)[number];

export const BOARD_MANDATE_STATUSES = ["DRAFT", "SUBMITTED", "VALIDATED", "REJECTED", "ENDED"] as const;
export type BoardMandateStatus = (typeof BOARD_MANDATE_STATUSES)[number];

const TRANSITIONS: Record<BoardMandateStatus, readonly BoardMandateStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["VALIDATED", "REJECTED"],
  VALIDATED: ["ENDED"],
  REJECTED: ["DRAFT"],
  ENDED: [],
};

export class GovernanceWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GovernanceWorkflowError";
  }
}

export function assertBoardMandateTransition(from: BoardMandateStatus, to: BoardMandateStatus): void {
  if (!TRANSITIONS[from].includes(to)) throw new GovernanceWorkflowError(`Transition de mandat interdite : ${from} -> ${to}`);
}

export function canEditBoardMandate(status: BoardMandateStatus): boolean {
  return status === "DRAFT" || status === "REJECTED";
}

/** Un club a un comité directeur officiel tant qu'un mandat VALIDATED est dans sa fenêtre de dates. */
export function isMandateInEffect(status: BoardMandateStatus, startsAt: string | Date, endsAt: string | Date, now = new Date()): boolean {
  return status === "VALIDATED" && new Date(startsAt) <= now && new Date(endsAt) >= now;
}
