import { describe, expect, it, vi } from 'vitest'
import type { DataSource, EntityManager } from 'typeorm'
import { processRegulatorySlaAlerts } from './regulatorySla'

function createSource() {
  let eventStatus: 'NONE' | 'PENDING' | 'PROCESSING' | 'SENT' = 'NONE'
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('FROM regulatory_sla_policies')) {
      return [{
        domain: 'GRANT',
        warn_after_hours: 1,
        overdue_after_hours: 2,
        escalation_after_hours: 3,
        version: 4,
      }]
    }
    if (sql.includes('FROM grant_applications')) {
      return [{
        entity_id: 'application-1',
        label: 'application-1',
        federation_id: 'fed-1',
        league_id: 'league-1',
        pending_since: new Date('2026-08-19T08:00:00Z'),
        hours_pending: 1,
      }]
    }
    if (sql.includes('FROM User')) return [{ id: 'fed-admin-1' }, { id: 'league-admin-1' }]
    if (sql.startsWith('UPDATE regulatory_sla_alert_events') && sql.includes("status = 'SENT'")) {
      eventStatus = 'SENT'
      return { affectedRows: 1 }
    }
    if (sql.startsWith('UPDATE regulatory_sla_alert_events') && sql.includes("status = 'PENDING'")) {
      eventStatus = 'PENDING'
      return { affectedRows: 1 }
    }
    return []
  })
  const managerQuery = vi.fn(async (sql: string) => {
    if (sql.startsWith('INSERT IGNORE INTO regulatory_sla_alert_events')) {
      if (eventStatus === 'NONE') eventStatus = 'PENDING'
      return { affectedRows: eventStatus === 'PENDING' ? 1 : 0 }
    }
    if (sql.startsWith('UPDATE regulatory_sla_alert_events') && sql.includes("status = 'PROCESSING'")) {
      if (eventStatus !== 'PENDING') return { affectedRows: 0 }
      eventStatus = 'PROCESSING'
      return { affectedRows: 1 }
    }
    return []
  })
  const manager = { query: managerQuery } as unknown as EntityManager
  const transaction = vi.fn(async (callback: (manager: EntityManager) => Promise<unknown>) => callback(manager))
  return {
    source: { query, transaction } as unknown as DataSource,
    getStatus: () => eventStatus,
  }
}

describe('processRegulatorySlaAlerts (GOV-008)', () => {
  it('sends a reminder once for the same workflow cycle even when the processor runs twice', async () => {
    const fixture = createSource()
    const deliver = vi.fn().mockResolvedValue({ id: 'notification-1' })
    const at = new Date('2026-08-19T09:30:00Z')

    const first = await processRegulatorySlaAlerts(fixture.source, 'fed-1', at, deliver)
    const second = await processRegulatorySlaAlerts(fixture.source, 'fed-1', at, deliver)

    expect(first).toMatchObject({ claimed: 1, sent: 1, retriableFailures: 0 })
    expect(second).toMatchObject({ claimed: 0, sent: 0 })
    expect(deliver).toHaveBeenCalledTimes(1)
    expect(deliver).toHaveBeenCalledWith(expect.objectContaining({
      eventId: 'workflow-sla:REGULATORY:GRANT:application-1:REMINDER:2026-08-19T08:00:00.000Z:v4',
      target: { type: 'USER', userIds: ['fed-admin-1', 'league-admin-1'] },
    }))
  })

  it('returns a failed notification to PENDING so a later execution can retry', async () => {
    const fixture = createSource()
    const deliver = vi.fn()
      .mockRejectedValueOnce(new Error('notifications unavailable'))
      .mockResolvedValueOnce({ id: 'notification-2' })
    const at = new Date('2026-08-19T09:30:00Z')

    const failed = await processRegulatorySlaAlerts(fixture.source, 'fed-1', at, deliver)
    expect(failed.retriableFailures).toBe(1)
    expect(fixture.getStatus()).toBe('PENDING')

    const retried = await processRegulatorySlaAlerts(fixture.source, 'fed-1', at, deliver)
    expect(retried.sent).toBe(1)
    expect(fixture.getStatus()).toBe('SENT')
    expect(deliver).toHaveBeenCalledTimes(2)
  })
})
