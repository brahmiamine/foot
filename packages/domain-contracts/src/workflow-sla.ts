export type WorkflowSlaState =
  | 'IN_SLA'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'ESCALATION_DUE'

export type WorkflowSlaAlertStage = 'REMINDER' | 'ESCALATION'

export interface WorkflowSlaThresholds {
  reminderAfterMinutes: number
  dueAfterMinutes: number
  escalationAfterMinutes: number
}

export interface WorkflowSlaSchedule {
  startedAt: Date
  reminderAt: Date
  dueAt: Date
  escalationAt: Date
}

export interface WorkflowSlaEventIdentity {
  domain: string
  entityId: string
  stage: WorkflowSlaAlertStage
  cycleStartedAt: Date
  policyVersion?: number | null
}

export function assertWorkflowSlaThresholds(
  thresholds: WorkflowSlaThresholds,
): void {
  const values = [
    thresholds.reminderAfterMinutes,
    thresholds.dueAfterMinutes,
    thresholds.escalationAfterMinutes,
  ]
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('Workflow SLA thresholds must be finite non-negative numbers')
  }
  if (
    thresholds.reminderAfterMinutes > thresholds.dueAfterMinutes ||
    thresholds.dueAfterMinutes > thresholds.escalationAfterMinutes
  ) {
    throw new Error(
      'Workflow SLA thresholds must satisfy reminder <= due <= escalation',
    )
  }
}

export function computeWorkflowSlaSchedule(
  startedAt: Date,
  thresholds: WorkflowSlaThresholds,
): WorkflowSlaSchedule {
  if (Number.isNaN(startedAt.getTime())) {
    throw new Error('Workflow SLA start date is invalid')
  }
  assertWorkflowSlaThresholds(thresholds)
  return {
    startedAt: new Date(startedAt),
    reminderAt: new Date(
      startedAt.getTime() + thresholds.reminderAfterMinutes * 60_000,
    ),
    dueAt: new Date(startedAt.getTime() + thresholds.dueAfterMinutes * 60_000),
    escalationAt: new Date(
      startedAt.getTime() + thresholds.escalationAfterMinutes * 60_000,
    ),
  }
}

export function resolveWorkflowSlaState(
  schedule: WorkflowSlaSchedule,
  at: Date = new Date(),
): WorkflowSlaState {
  if (at >= schedule.escalationAt) return 'ESCALATION_DUE'
  if (at >= schedule.dueAt) return 'OVERDUE'
  if (at >= schedule.reminderAt) return 'DUE_SOON'
  return 'IN_SLA'
}

export function buildWorkflowSlaEventId(
  identity: WorkflowSlaEventIdentity,
): string {
  const version = identity.policyVersion == null ? 'default' : `v${identity.policyVersion}`
  return [
    'workflow-sla',
    identity.domain,
    identity.entityId,
    identity.stage,
    identity.cycleStartedAt.toISOString(),
    version,
  ].join(':')
}
