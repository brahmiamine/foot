import type { TranslationKey } from "@/i18n/dictionaries";

type AvailabilityStatus = "AVAILABLE" | "INJURED" | "SUSPENDED";

export function countAvailability(statuses: Iterable<AvailabilityStatus>) {
  const counts: Record<AvailabilityStatus, number> = { AVAILABLE: 0, INJURED: 0, SUSPENDED: 0 };
  for (const status of statuses) counts[status] += 1;
  return counts;
}

export function getConvocationMessage(answered: number, total: number): { key: TranslationKey; values?: Record<string, number> } {
  if (total <= 0) return { key: "dashboard.callups.none" };
  return { key: "dashboard.callups.responses", values: { answered, total } };
}

export function getRoleLabelKey(role: string): TranslationKey | null {
  if (role === "ADMIN") return "role.admin";
  if (role === "OBSERVATEUR") return "role.staff";
  return null;
}
