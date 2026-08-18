import { EntityManager, FindOperator } from 'typeorm';
import { NotificationPolicyAudit } from '../policy/entities/notification-policy-audit.entity';
import { NotificationEscalationPolicy } from './entities/notification-escalation-policy.entity';
import { EscalationPolicyService } from './escalation-policy.service';

function whereValue(value: unknown): unknown {
  return value instanceof FindOperator && value.type === 'isNull'
    ? null
    : value;
}

function buildService(rows: NotificationEscalationPolicy[]) {
  let seq = rows.length;
  const repository = {
    find: () => Promise.resolve(rows),
    findOne: (options: { where: Record<string, unknown> }) => {
      const matches = rows.filter(
        (row) =>
          row.scopeType === options.where.scopeType &&
          row.scopeId === whereValue(options.where.scopeId) &&
          row.category === whereValue(options.where.category),
      );
      matches.sort((a, b) => b.version - a.version);
      return Promise.resolve(matches[0] ?? null);
    },
    create: (data: Partial<NotificationEscalationPolicy>) =>
      ({ id: `esc-policy-${++seq}`, ...data }) as NotificationEscalationPolicy,
    save: (row: NotificationEscalationPolicy) => {
      rows.push(row);
      return Promise.resolve(row);
    },
  };
  const auditRepository = {
    create: (data: unknown) => data,
    save: (row: unknown) => Promise.resolve(row),
  };

  const managerFor = (): EntityManager =>
    ({
      getRepository: (entity: unknown) =>
        entity === NotificationPolicyAudit ? auditRepository : repository,
    }) as unknown as EntityManager;

  const dataSource = {
    transaction: jest.fn(
      async <T>(work: (manager: EntityManager) => Promise<T>) =>
        work(managerFor()),
    ),
  };

  return new EscalationPolicyService(
    dataSource as never,
    repository as never,
    auditRepository as never,
  );
}

describe('EscalationPolicyService (NOTIF-004)', () => {
  it('is disabled by default when nothing is configured', async () => {
    const service = buildService([]);
    const resolved = await service.resolve('team-1', 'SECURITY_ALERT');
    expect(resolved.enabled).toBe(false);
  });

  it('rejects enabling a policy without a backup recipient', async () => {
    const service = buildService([]);
    await expect(
      service.upsert({
        scopeType: 'PLATFORM',
        scopeId: null,
        category: 'SECURITY_ALERT',
        enabled: true,
        delayMinutes: 15,
        backupUserId: null,
        backupRole: null,
        actorUserId: 'admin-1',
        actorRole: 'SUPERADMIN',
        reason: 'Enable without backup',
      }),
    ).rejects.toThrow('backupUserId or backupRole');
  });

  it('lets a CLUB policy override the PLATFORM delay/backup for the same category', async () => {
    const service = buildService([]);
    await service.upsert({
      scopeType: 'PLATFORM',
      scopeId: null,
      category: 'SECURITY_ALERT',
      enabled: true,
      delayMinutes: 30,
      backupUserId: 'platform-backup',
      backupRole: null,
      actorUserId: 'admin-1',
      actorRole: 'SUPERADMIN',
      reason: 'Plateforme : escalade sécurité',
    });
    await service.upsert({
      scopeType: 'CLUB',
      scopeId: 'team-1',
      category: 'SECURITY_ALERT',
      enabled: true,
      delayMinutes: 10,
      backupUserId: 'club-backup',
      backupRole: null,
      actorUserId: 'club-admin-1',
      actorRole: 'ADMIN',
      reason: 'Club : escalade plus rapide',
    });

    const resolved = await service.resolve('team-1', 'SECURITY_ALERT');
    expect(resolved).toEqual({
      enabled: true,
      delayMinutes: 10,
      backupUserId: 'club-backup',
      backupRole: null,
    });

    const otherClub = await service.resolve('team-2', 'SECURITY_ALERT');
    expect(otherClub).toEqual({
      enabled: true,
      delayMinutes: 30,
      backupUserId: 'platform-backup',
      backupRole: null,
    });
  });
});
