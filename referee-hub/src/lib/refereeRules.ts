import type { AssignmentRole, AssignmentStatus } from "@/entities/Assignment";
import type { RefereeMatchReportType } from "@/entities/RefereeMatchReport";

const REPORT_ROLES = new Set<AssignmentRole>([
  "CENTER_REFEREE",
  "ASSISTANT_REFEREE",
  "FOURTH_OFFICIAL",
  "MATCH_DELEGATE",
  "REFEREE_OBSERVER",
]);

export function canWriteMatchReport(role: AssignmentRole, assignmentStatus: AssignmentStatus, matchStatus: string): boolean {
  return REPORT_ROLES.has(role) && assignmentStatus === "ACTIVE" && matchStatus === "FINISHED";
}

export function reportTypeForRole(role: AssignmentRole): RefereeMatchReportType | null {
  if (["CENTER_REFEREE", "ASSISTANT_REFEREE", "FOURTH_OFFICIAL"].includes(role)) {
    return "REFEREE_COMPLEMENTARY";
  }
  if (role === "MATCH_DELEGATE") return "MATCH_DELEGATE";
  if (role === "REFEREE_OBSERVER") return "REFEREE_OBSERVER";
  return null;
}

export function validateDateRange(startDate: string, endDate: string, today = new Date().toISOString().slice(0, 10)): string | null {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(startDate) || !datePattern.test(endDate)) return "Format de date invalide";
  if (endDate < startDate) return "La date de fin doit être postérieure à la date de début";
  if (endDate < today) return "Une indisponibilité ne peut pas se terminer dans le passé";
  return null;
}
