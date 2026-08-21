export type DesignationMode = "MANUAL" | "SUGGESTED" | "AUTO";

export interface DesignationPolicyValues {
  mode: DesignationMode;
  minRestHours: number;
  requiredGrades: string[] | null;
  minHistoryMatches: number;
  maxDistanceKm: number | null;
}

export const DEFAULT_DESIGNATION_POLICY: DesignationPolicyValues = {
  mode: "MANUAL",
  minRestHours: 48,
  requiredGrades: null,
  minHistoryMatches: 0,
  maxDistanceKm: null,
};

export interface DesignationCandidateInput {
  userId: string;
  available: boolean;
  grade?: string | null;
  restHoursBeforeMatch?: number | null;
  priorAssignmentsCount?: number;
  distanceKm?: number | null;
}

export interface DesignationCandidateEvaluation {
  userId: string;
  eligible: boolean;
  reasons: string[];
  score: number;
}

/**
 * REF-006 — dispo (disponibilité) reste un garde-fou absolu, indépendant du
 * mode de désignation (déjà appliqué par `MatchOfficialAssignmentService`).
 * Les autres critères (grade/repos/distance/historique) ne s'appliquent
 * qu'en mode SUGGESTED/AUTO : en MANUAL, aucun filtrage automatique au-delà
 * de la disponibilité. Un critère dont la donnée n'est pas fournie
 * (`null`/`undefined`) n'est jamais bloquant — l'absence de donnée ne doit
 * jamais se comporter comme une exclusion silencieuse.
 */
export function evaluateDesignationCandidate(
  policy: DesignationPolicyValues,
  candidate: DesignationCandidateInput,
): DesignationCandidateEvaluation {
  const reasons: string[] = [];

  if (!candidate.available) reasons.push("Indisponible sur la date du match");

  if (policy.mode !== "MANUAL") {
    if (policy.requiredGrades?.length && candidate.grade && !policy.requiredGrades.includes(candidate.grade)) {
      reasons.push(`Grade ${candidate.grade} non éligible (requis : ${policy.requiredGrades.join(", ")})`);
    }
    if (
      policy.minRestHours > 0 &&
      candidate.restHoursBeforeMatch != null &&
      candidate.restHoursBeforeMatch < policy.minRestHours
    ) {
      reasons.push(`Repos insuffisant (${candidate.restHoursBeforeMatch}h < ${policy.minRestHours}h requis)`);
    }
    if (
      policy.minHistoryMatches > 0 &&
      candidate.priorAssignmentsCount != null &&
      candidate.priorAssignmentsCount < policy.minHistoryMatches
    ) {
      reasons.push(`Historique insuffisant (${candidate.priorAssignmentsCount} < ${policy.minHistoryMatches} matchs requis)`);
    }
    if (policy.maxDistanceKm != null && candidate.distanceKm != null && candidate.distanceKm > policy.maxDistanceKm) {
      reasons.push(`Distance excessive (${candidate.distanceKm}km > ${policy.maxDistanceKm}km autorisés)`);
    }
  }

  const score =
    (candidate.priorAssignmentsCount ?? 0) * 10 +
    (candidate.restHoursBeforeMatch ?? 0) -
    (candidate.distanceKm ?? 0);

  return { userId: candidate.userId, eligible: reasons.length === 0, reasons, score };
}

/** Classement décroissant par score, réservé aux modes SUGGESTED/AUTO (l'appelant décide de l'usage). */
export function rankDesignationCandidates(
  policy: DesignationPolicyValues,
  candidates: DesignationCandidateInput[],
): DesignationCandidateEvaluation[] {
  return candidates
    .map((candidate) => evaluateDesignationCandidate(policy, candidate))
    .sort((left, right) => Number(right.eligible) - Number(left.eligible) || right.score - left.score);
}
