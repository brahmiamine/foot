export const DISCIPLINARY_PERSON_TYPES = ["PLAYER", "COACH", "STAFF", "REFEREE", "AGENT", "OTHER"] as const;
export type DisciplinaryPersonType = (typeof DISCIPLINARY_PERSON_TYPES)[number];

export const DISCIPLINARY_CASE_STATUSES = ["OPEN", "UNDER_REVIEW", "HEARING_SCHEDULED", "DECIDED", "APPEALED", "CLOSED"] as const;
export type DisciplinaryCaseStatus = (typeof DISCIPLINARY_CASE_STATUSES)[number];

const TRANSITIONS: Record<DisciplinaryCaseStatus, readonly DisciplinaryCaseStatus[]> = {
  OPEN: ["UNDER_REVIEW", "CLOSED"],
  UNDER_REVIEW: ["HEARING_SCHEDULED", "DECIDED", "CLOSED"],
  HEARING_SCHEDULED: ["DECIDED", "CLOSED"],
  DECIDED: ["APPEALED", "CLOSED"],
  APPEALED: ["CLOSED"],
  CLOSED: [],
};

export class DisciplinaryCaseWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DisciplinaryCaseWorkflowError";
  }
}

export function assertDisciplinaryCaseTransition(from: DisciplinaryCaseStatus, to: DisciplinaryCaseStatus): void {
  if (!TRANSITIONS[from].includes(to)) throw new DisciplinaryCaseWorkflowError(`Transition de dossier disciplinaire interdite : ${from} -> ${to}`);
}

export function formatDisciplinaryCaseNumber(year: number, sequence: number): string {
  return `DC-${year}-${String(sequence).padStart(5, "0")}`;
}
