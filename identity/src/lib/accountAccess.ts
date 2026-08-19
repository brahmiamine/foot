export interface AccountAccessWindow {
  isActive: boolean;
  accessValidFrom?: Date | null;
  accessValidUntil?: Date | null;
}

/**
 * Account access follows [validFrom, validUntil): start inclusive, end exclusive.
 * Missing bounds mean unbounded on that side. This check deliberately reads
 * persisted account state rather than JWT claims so an already-issued token
 * cannot outlive an administrative access window.
 */
export function isAccountAccessAllowed(
  account: AccountAccessWindow,
  at: Date = new Date(),
): boolean {
  if (!account.isActive) return false;
  if (account.accessValidFrom && at.getTime() < account.accessValidFrom.getTime()) return false;
  if (account.accessValidUntil && at.getTime() >= account.accessValidUntil.getTime()) return false;
  return true;
}

export function isValidAccessWindow(
  validFrom: Date | null | undefined,
  validUntil: Date | null | undefined,
): boolean {
  if (validFrom && Number.isNaN(validFrom.getTime())) return false;
  if (validUntil && Number.isNaN(validUntil.getTime())) return false;
  if (validFrom && validUntil && validFrom.getTime() >= validUntil.getTime()) return false;
  return true;
}