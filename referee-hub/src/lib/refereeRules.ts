import type { AssignmentRole, AssignmentStatus } from "@/entities/Assignment";

const REPORT_ROLES = new Set<AssignmentRole>([
  "CENTER_REFEREE",
  "ASSISTANT_REFEREE",
  "FOURTH_OFFICIAL",
]);

export function canWriteMatchReport(role: AssignmentRole, assignmentStatus: AssignmentStatus, matchStatus: string): boolean {
  return REPORT_ROLES.has(role) && assignmentStatus === "ACTIVE" && matchStatus === "FINISHED";
}

export function validateDateRange(startDate: string, endDate: string, today = new Date().toISOString().slice(0, 10)): string | null {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(startDate) || !datePattern.test(endDate)) return "Format de date invalide";
  if (endDate < startDate) return "La date de fin doit être postérieure à la date de début";
  if (endDate < today) return "Une indisponibilité ne peut pas se terminer dans le passé";
  return null;
}
