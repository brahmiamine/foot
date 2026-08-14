export const TRANSFER_WINDOW_TYPES = ["SUMMER", "WINTER", "SPECIAL", "YOUTH", "AMATEUR"] as const;
export type TransferWindowType = (typeof TRANSFER_WINDOW_TYPES)[number];
export const TRANSFER_WINDOW_STATUSES = ["PLANNED", "OPEN", "CLOSED", "SUSPENDED"] as const;
export type TransferWindowStatus = (typeof TRANSFER_WINDOW_STATUSES)[number];

const TRANSITIONS: Record<TransferWindowStatus, readonly TransferWindowStatus[]> = {
  PLANNED: ["OPEN", "CLOSED", "SUSPENDED"],
  OPEN: ["CLOSED", "SUSPENDED"],
  CLOSED: ["OPEN"],
  SUSPENDED: ["OPEN", "CLOSED"],
};

export class TransferWindowError extends Error {
  code = "TRANSFER_WINDOW_CLOSED";
  constructor(message = "TRANSFER_WINDOW_CLOSED") { super(message); this.name = "TransferWindowError"; }
}

export function assertTransferWindowTransition(from: TransferWindowStatus, to: TransferWindowStatus): void {
  if (!TRANSITIONS[from].includes(to)) throw new TransferWindowError(`Transition de fenêtre interdite : ${from} -> ${to}`);
}

export function isTransferWindowOpen(
  window: { status: TransferWindowStatus; opensAt: Date | string; closesAt: Date | string },
  at = new Date(),
): boolean {
  const value = at.getTime();
  return window.status === "OPEN" && new Date(window.opensAt).getTime() <= value && value <= new Date(window.closesAt).getTime();
}

export function assertTransferException(input?: { reason?: string | null; legalReference?: string | null }): void {
  if (!input?.reason?.trim() || !input.legalReference?.trim()) {
    throw new TransferWindowError("Le motif et la référence réglementaire sont obligatoires pour une exception");
  }
}
