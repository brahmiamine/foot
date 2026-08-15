import type { TranslationKey } from "@/i18n/dictionaries";

export function getAlertMessage(kind: string, daysDiff: number): { key: TranslationKey; values: { days: number } } {
  return kind === "OVERDUE"
    ? { key: "dashboard.alerts.overdue", values: { days: Math.abs(daysDiff) } }
    : { key: "dashboard.alerts.upcoming", values: { days: daysDiff } };
}

export function getRoleLabelKey(role: string): TranslationKey | null {
  if (role === "ADMIN") return "role.admin";
  if (role === "OBSERVATEUR") return "role.staff";
  return null;
}
