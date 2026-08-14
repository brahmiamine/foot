export const CLUB_SANCTION_TYPES = ["TRANSFER_BAN", "REGISTRATION_BAN", "COMPETITION_BAN", "FINE", "POINT_DEDUCTION", "MATCH_BEHIND_CLOSED_DOORS", "STADIUM_SUSPENSION", "COMPETITION_EXCLUSION", "WARNING"] as const;
export type ClubSanctionType = (typeof CLUB_SANCTION_TYPES)[number];
export const CLUB_SANCTION_STATUSES = ["ACTIVE", "SUSPENDED", "LIFTED", "EXPIRED", "CANCELLED"] as const;
export type ClubSanctionStatus = (typeof CLUB_SANCTION_STATUSES)[number];
export const CLUB_SANCTION_SOURCE_TYPES = ["LEGAL_CASE", "DISCIPLINARY_CASE", "MANUAL"] as const;
export type ClubSanctionSourceType = (typeof CLUB_SANCTION_SOURCE_TYPES)[number];

const TRANSITIONS: Record<ClubSanctionStatus, readonly ClubSanctionStatus[]> = {
  ACTIVE: ["SUSPENDED", "LIFTED", "EXPIRED", "CANCELLED"],
  SUSPENDED: ["ACTIVE", "LIFTED", "CANCELLED"],
  LIFTED: [],
  EXPIRED: [],
  CANCELLED: [],
};

/** États considérés comme "en vigueur" pour le calcul des blocages réglementaires. */
const ENFORCEABLE_STATUSES: readonly ClubSanctionStatus[] = ["ACTIVE"];

export class ClubSanctionWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClubSanctionWorkflowError";
  }
}

export function assertClubSanctionTransition(from: ClubSanctionStatus, to: ClubSanctionStatus): void {
  if (!TRANSITIONS[from].includes(to)) throw new ClubSanctionWorkflowError(`Transition de sanction interdite : ${from} -> ${to}`);
}

/** Une sanction n'est opposable que si elle est ACTIVE et, si datée, dans sa fenêtre startsAt/endsAt. */
export function isClubSanctionEnforceable(status: ClubSanctionStatus, startsAt: string | Date, endsAt?: string | Date | null, now = new Date()): boolean {
  if (!ENFORCEABLE_STATUSES.includes(status)) return false;
  if (new Date(startsAt) > now) return false;
  if (endsAt && new Date(endsAt) < now) return false;
  return true;
}

export function blocksTransfers(type: ClubSanctionType): boolean {
  return type === "TRANSFER_BAN";
}

export function blocksRegistrations(type: ClubSanctionType): boolean {
  return type === "REGISTRATION_BAN";
}

export function blocksCompetitionEntry(type: ClubSanctionType): boolean {
  return type === "COMPETITION_BAN" || type === "COMPETITION_EXCLUSION";
}

export function requiresLiftMotivation(target: ClubSanctionStatus): boolean {
  return target === "LIFTED" || target === "CANCELLED";
}
