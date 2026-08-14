import type { AssignmentRole, AssignmentStatus } from "@/entities/Assignment";

export type AssignmentFilter = "upcoming" | "past" | "revoked";

export function resolveAssignmentFilter(raw: string | null | undefined): AssignmentFilter {
  if (raw === "past" || raw === "revoked") return raw;
  return "upcoming";
}

export function assignmentBucket(
  status: AssignmentStatus,
  matchStatus: string,
  matchDate: Date | null | undefined,
  now = new Date(),
): AssignmentFilter {
  if (status === "REVOKED") return "revoked";
  if (matchStatus === "FINISHED" || matchStatus === "CANCELLED") return "past";
  if (matchStatus === "IN_PROGRESS") return "upcoming";
  if (matchDate && matchDate.getTime() < now.getTime()) return "past";
  return "upcoming";
}

const roleLabels: Record<AssignmentRole, { fr: string; ar: string }> = {
  CENTER_REFEREE: { fr: "Arbitre central", ar: "حكم ساحة" },
  ASSISTANT_REFEREE: { fr: "Arbitre assistant", ar: "حكم مساعد" },
  FOURTH_OFFICIAL: { fr: "Quatrième arbitre", ar: "الحكم الرابع" },
  MATCH_DELEGATE: { fr: "Délégué de match", ar: "مراقب المباراة" },
  REFEREE_OBSERVER: { fr: "Observateur d'arbitres", ar: "مراقب الحكام" },
  TEAM_REPRESENTATIVE: { fr: "Représentant d'équipe", ar: "ممثل الفريق" },
};

export function roleLabel(role: AssignmentRole, locale: "fr" | "ar"): string {
  return roleLabels[role][locale];
}

export function formatDate(date: Date | null | undefined, locale: "fr" | "ar", options?: Intl.DateTimeFormatOptions): string {
  if (!date) return locale === "ar" ? "غير محدد" : "À confirmer";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-TN" : "fr-FR", options ?? {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
