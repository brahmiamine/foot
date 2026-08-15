import type { TranslationKey } from "@/i18n/dictionaries";

export function getTrainingAttendance(attended: number, total: number): string {
  if (total <= 0) return "—";
  return `${Math.round((attended / total) * 100)}%`;
}

export function getAgendaLabelKey(type: string): TranslationKey {
  return type === "MATCH" ? "dashboard.agenda.match" : "dashboard.agenda.training";
}

export function getAvailabilityLabelKey(available: boolean, reason?: string | null): TranslationKey {
  if (available) return "dashboard.status.available";
  return reason === "INJURED" ? "dashboard.status.injured" : "dashboard.status.suspended";
}
