export const FOOTBALL_AGENT_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "REVOKED", "EXPIRED"] as const;
export type FootballAgentStatus = (typeof FOOTBALL_AGENT_STATUSES)[number];

const AGENT_TRANSITIONS: Record<FootballAgentStatus, readonly FootballAgentStatus[]> = {
  PENDING: ["ACTIVE", "REVOKED"],
  ACTIVE: ["SUSPENDED", "REVOKED", "EXPIRED"],
  SUSPENDED: ["ACTIVE", "REVOKED"],
  REVOKED: [],
  EXPIRED: [],
};

export const REPRESENTATION_AGREEMENT_STATUSES = ["DRAFT", "ACTIVE", "TERMINATED", "EXPIRED"] as const;
export type RepresentationAgreementStatus = (typeof REPRESENTATION_AGREEMENT_STATUSES)[number];

const AGREEMENT_TRANSITIONS: Record<RepresentationAgreementStatus, readonly RepresentationAgreementStatus[]> = {
  DRAFT: ["ACTIVE", "TERMINATED"],
  ACTIVE: ["TERMINATED", "EXPIRED"],
  TERMINATED: [],
  EXPIRED: [],
};

export class AgentWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentWorkflowError";
  }
}

export function assertFootballAgentTransition(from: FootballAgentStatus, to: FootballAgentStatus): void {
  if (!AGENT_TRANSITIONS[from].includes(to)) throw new AgentWorkflowError(`Transition d'agent interdite : ${from} -> ${to}`);
}

export function assertRepresentationAgreementTransition(from: RepresentationAgreementStatus, to: RepresentationAgreementStatus): void {
  if (!AGREEMENT_TRANSITIONS[from].includes(to)) throw new AgentWorkflowError(`Transition de mandat de représentation interdite : ${from} -> ${to}`);
}

export function isFootballAgentActive(status: FootballAgentStatus, validUntil?: string | Date | null, now = new Date()): boolean {
  if (status !== "ACTIVE") return false;
  if (!validUntil) return true;
  return new Date(validUntil) >= now;
}
