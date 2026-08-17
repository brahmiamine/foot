import type { InjurySeverity, ReturnToPlayStage } from "@/entities/Injury";
import type { InjuryClearanceDecision } from "@/entities/InjuryClearance";

export interface ReturnToPlayPolicy {
  clearanceRequired: boolean;
  severeSecondOpinionRequired: boolean;
}

const NEXT_STAGE: Partial<Record<ReturnToPlayStage, ReturnToPlayStage>> = {
  INJURED: "TREATMENT",
  TREATMENT: "INDIVIDUAL",
  INDIVIDUAL: "PARTIAL",
  PARTIAL: "FULL",
  FULL: "CLEARANCE",
};

export function expectedNextStage(
  current: ReturnToPlayStage,
  policy: ReturnToPlayPolicy,
): ReturnToPlayStage | null {
  if (current === "AVAILABLE" || current === "CLEARANCE") return null;
  if (current === "FULL" && !policy.clearanceRequired) return "AVAILABLE";
  return NEXT_STAGE[current] ?? null;
}

export function requiredClearances(
  severity: InjurySeverity,
  policy: ReturnToPlayPolicy,
): number {
  return severity === "SEVERE" && policy.severeSecondOpinionRequired ? 2 : 1;
}

export function countLatestClearances(
  decisions: Array<{ reviewerUserId: string; decision: InjuryClearanceDecision }>,
): number {
  const latestByReviewer = new Map<string, InjuryClearanceDecision>();
  for (const decision of decisions) latestByReviewer.set(decision.reviewerUserId, decision.decision);
  return [...latestByReviewer.values()].filter((decision) => decision === "CLEAR").length;
}
