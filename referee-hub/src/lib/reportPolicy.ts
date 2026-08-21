import type { AssignmentRole } from "@/entities/Assignment";
import type { RefereeReportPolicyValues } from "@/entities/RefereeReportPolicy";
import {
  computeWorkflowSlaSchedule,
  resolveWorkflowSlaState,
  type WorkflowSlaSchedule,
  type WorkflowSlaState,
} from "../../../packages/domain-contracts/src/workflow-sla";

export const DEFAULT_REPORT_POLICY: RefereeReportPolicyValues = {
  mandatoryRoles: ["CENTER_REFEREE", "MATCH_DELEGATE", "REFEREE_OBSERVER"],
  deadlineHoursAfterMatch: 72,
  reminderHoursBeforeDeadline: 24,
  escalationHoursAfterDeadline: 48,
};

export function isReportMandatoryForRole(policy: RefereeReportPolicyValues, role: AssignmentRole): boolean {
  return policy.mandatoryRoles.includes(role);
}

/**
 * REF-004 — délai/rappel/escalade dérivés de la policy via le contrat
 * partagé GOV-008 `workflow-sla`. `startedAt` est l'heure de fin du match
 * (ou sa date faute de mieux) : le cycle démarre dès que le rapport devient
 * exigible.
 */
export function computeReportSlaSchedule(
  policy: RefereeReportPolicyValues,
  matchFinishedAt: Date,
): WorkflowSlaSchedule {
  const dueAfterMinutes = policy.deadlineHoursAfterMatch * 60;
  const reminderAfterMinutes = Math.max(0, dueAfterMinutes - policy.reminderHoursBeforeDeadline * 60);
  const escalationAfterMinutes = dueAfterMinutes + policy.escalationHoursAfterDeadline * 60;
  return computeWorkflowSlaSchedule(matchFinishedAt, {
    reminderAfterMinutes,
    dueAfterMinutes,
    escalationAfterMinutes,
  });
}

export function resolveReportSlaState(schedule: WorkflowSlaSchedule, at: Date = new Date()): WorkflowSlaState {
  return resolveWorkflowSlaState(schedule, at);
}
