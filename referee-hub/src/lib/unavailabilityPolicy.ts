import type { UnavailabilityReasonCategory } from "@/entities/RefereeUnavailability";
import type { RefereeUnavailabilityPolicyValues } from "@/entities/RefereeUnavailabilityPolicy";

export const DEFAULT_UNAVAILABILITY_POLICY: RefereeUnavailabilityPolicyValues = {
  noticeMinHours: 48,
  maxDurationDays: 90,
  recurrenceAllowed: false,
  proofRequiredReasons: ["MEDICAL"],
};

export interface UnavailabilityRequestInput {
  startDate: string;
  endDate: string;
  reasonCategory: UnavailabilityReasonCategory;
  proofDocumentUrl?: string | null;
  recurrenceDaysOfWeek?: number[] | null;
  recurrenceEndDate?: string | null;
}

function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (60 * 60 * 1000);
}

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

/**
 * REF-003 — préavis minimal, durée maximale, récurrence conditionnelle à la
 * policy, justificatif obligatoire selon la catégorie de motif. Fonction
 * pure, testable sans DB (mirrors `assignmentWorkflowPolicy.ts`).
 */
export function validateUnavailabilityRequest(
  policy: RefereeUnavailabilityPolicyValues,
  input: UnavailabilityRequestInput,
  now: Date = new Date(),
): string | null {
  const start = new Date(`${input.startDate}T00:00:00Z`);
  if (hoursBetween(now, start) < policy.noticeMinHours) {
    return `Un préavis minimal de ${policy.noticeMinHours} heures est requis pour déclarer une indisponibilité`;
  }

  const durationDays = daysBetween(input.startDate, input.endDate);
  if (durationDays > policy.maxDurationDays) {
    return `Une indisponibilité ne peut pas dépasser ${policy.maxDurationDays} jours`;
  }

  const hasRecurrence = Boolean(input.recurrenceDaysOfWeek?.length || input.recurrenceEndDate);
  if (hasRecurrence) {
    if (!policy.recurrenceAllowed) {
      return "Les indisponibilités récurrentes ne sont pas autorisées par la politique en vigueur";
    }
    if (!input.recurrenceDaysOfWeek?.length || !input.recurrenceEndDate) {
      return "Une récurrence nécessite les jours de la semaine et une date de fin de récurrence";
    }
    if (input.recurrenceDaysOfWeek.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
      return "Jours de récurrence invalides";
    }
    if (input.recurrenceEndDate < input.endDate) {
      return "La date de fin de récurrence doit être postérieure à la fin de la première occurrence";
    }
  }

  if (policy.proofRequiredReasons.includes(input.reasonCategory) && !input.proofDocumentUrl?.trim()) {
    return "Un justificatif est requis pour ce motif d'indisponibilité";
  }

  return null;
}
