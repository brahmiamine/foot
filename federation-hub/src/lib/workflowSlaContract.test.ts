import { describe, expect, it } from 'vitest'
import {
  buildWorkflowSlaEventId,
  computeWorkflowSlaSchedule,
  resolveWorkflowSlaState,
} from '../../../packages/domain-contracts/src/workflow-sla'

describe('shared workflow SLA contract (GOV-008)', () => {
  const startedAt = new Date('2026-08-19T08:00:00Z')
  const schedule = computeWorkflowSlaSchedule(startedAt, {
    reminderAfterMinutes: 60,
    dueAfterMinutes: 120,
    escalationAfterMinutes: 180,
  })

  it('computes deterministic reminder, due and escalation timestamps', () => {
    expect(schedule.reminderAt.toISOString()).toBe('2026-08-19T09:00:00.000Z')
    expect(schedule.dueAt.toISOString()).toBe('2026-08-19T10:00:00.000Z')
    expect(schedule.escalationAt.toISOString()).toBe('2026-08-19T11:00:00.000Z')
  })

  it('uses the same state semantics across workflow owners', () => {
    expect(resolveWorkflowSlaState(schedule, new Date('2026-08-19T08:30:00Z'))).toBe('IN_SLA')
    expect(resolveWorkflowSlaState(schedule, new Date('2026-08-19T09:30:00Z'))).toBe('DUE_SOON')
    expect(resolveWorkflowSlaState(schedule, new Date('2026-08-19T10:30:00Z'))).toBe('OVERDUE')
    expect(resolveWorkflowSlaState(schedule, new Date('2026-08-19T11:00:00Z'))).toBe('ESCALATION_DUE')
  })

  it('builds a stable idempotency key per workflow cycle and alert stage', () => {
    expect(
      buildWorkflowSlaEventId({
        domain: 'REGULATORY:GRANT',
        entityId: 'application-1',
        stage: 'REMINDER',
        cycleStartedAt: startedAt,
        policyVersion: 3,
      }),
    ).toBe('workflow-sla:REGULATORY:GRANT:application-1:REMINDER:2026-08-19T08:00:00.000Z:v3')
  })
})
