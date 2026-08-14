export const SEASON_REGULATORY_CYCLE_STATUSES = ["DRAFT", "ACTIVE", "CLOSED"] as const;
export type SeasonRegulatoryCycleStatus = (typeof SEASON_REGULATORY_CYCLE_STATUSES)[number];

const TRANSITIONS: Record<SeasonRegulatoryCycleStatus, readonly SeasonRegulatoryCycleStatus[]> = {
  DRAFT: ["ACTIVE", "CLOSED"],
  ACTIVE: ["CLOSED"],
  CLOSED: [],
};

export class SeasonRegulatoryCycleWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeasonRegulatoryCycleWorkflowError";
  }
}

export function assertSeasonRegulatoryCycleTransition(from: SeasonRegulatoryCycleStatus, to: SeasonRegulatoryCycleStatus): void {
  if (!TRANSITIONS[from].includes(to)) throw new SeasonRegulatoryCycleWorkflowError(`Transition de cycle réglementaire interdite : ${from} -> ${to}`);
}

/**
 * Une fenêtre (licence club ou inscription) n'est ouverte que si le cycle
 * n'est pas CLOSED, qu'une date d'ouverture a été fixée et atteinte, et que
 * la date de fermeture (si fixée) n'est pas dépassée. Absence de cycle pour
 * une saison = comportement historique inchangé, géré par l'appelant (pas
 * cette fonction) : voir migration-v2.md §36, ne jamais bloquer rétroactivement
 * les saisons non couvertes par un cycle.
 */
export function isRegulatoryWindowOpen(status: SeasonRegulatoryCycleStatus, opensAt?: string | Date | null, closesAt?: string | Date | null, now = new Date()): boolean {
  if (status === "CLOSED") return false;
  if (!opensAt) return false;
  if (new Date(opensAt) > now) return false;
  if (closesAt && new Date(closesAt) < now) return false;
  return true;
}
