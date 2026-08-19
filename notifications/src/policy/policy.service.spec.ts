import { EntityManager, FindOperator } from 'typeorm';
import { NotificationChannelType } from '../common/enums/channel.enum';
import { ChannelPolicyMode } from '../common/enums/channel-policy-mode.enum';
import { NotificationPolicy } from './entities/notification-policy.entity';
import { NotificationPolicyAudit } from './entities/notification-policy-audit.entity';
import { PolicyService } from './policy.service';

/** Réduit une valeur de `where` (littérale ou `IsNull()`) à une valeur de comparaison directe. */
function whereValue(value: unknown): unknown {
  return value instanceof FindOperator && value.type === 'isNull'
    ? null
    : value;
}

function buildService(
  rows: NotificationPolicy[],
  auditRows: NotificationPolicyAudit[],
) {
  let seq = rows.length;
  const repository = {
    find: () => Promise.resolve(rows),
    findOne: (options: { where: Record<string, unknown>; order?: unknown }) => {
      const matches = rows.filter(
        (row) =>
          row.scopeType === options.where.scopeType &&
          row.scopeId === whereValue(options.where.scopeId) &&
          row.category === whereValue(options.where.category),
      );
      matches.sort((a, b) => b.version - a.version);
      return Promise.resolve(matches[0] ?? null);
    },
    create: (data: Partial<NotificationPolicy>) =>
      ({ id: `policy-${++seq}`, ...data }) as NotificationPolicy,
    save: (row: NotificationPolicy) => {
      rows.push(row);
      return Promise.resolve(row);
    },
  };
  const auditRepository = {
    create: (data: Partial<NotificationPolicyAudit>) =>
      data as NotificationPolicyAudit,
    save: (row: NotificationPolicyAudit) => {
      auditRows.push(row);
      return Promise.resolve(row);
    },
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

  return new PolicyService(
    dataSource as never,
    repository as never,
    auditRepository as never,
  );
}

describe('PolicyService (NOTIF-001)', () => {
  it('defaults every channel to DEFAULT when no policy is configured', async () => {
    const service = buildService([], []);
    const selection = await service.resolveChannelSelection(
      'team-1',
      'MATCH_REMINDER',
      'MATCH_REMINDER',
      [NotificationChannelType.IN_APP, NotificationChannelType.EMAIL],
    );
    expect(selection.mandatory).toEqual([]);
    expect(selection.disabled).toEqual([]);
    expect(selection.eligibleForPreference).toEqual([
      NotificationChannelType.IN_APP,
      NotificationChannelType.EMAIL,
    ]);
  });

  it('lets a CLUB policy override the PLATFORM default for the same category', async () => {
    const rows: NotificationPolicy[] = [];
    const auditRows: NotificationPolicyAudit[] = [];
    const service = buildService(rows, auditRows);

    await service.upsert({
      scopeType: 'PLATFORM',
      scopeId: null,
      category: 'MARKETING',
      channels: { [NotificationChannelType.SMS]: ChannelPolicyMode.DISABLED },
      actorUserId: 'admin-1',
      actorRole: 'SUPERADMIN',
      reason: 'Plateforme : SMS jamais utilisé pour le marketing',
    });
    await service.upsert({
      scopeType: 'CLUB',
      scopeId: 'team-1',
      category: 'MARKETING',
      channels: {
        [NotificationChannelType.EMAIL]: ChannelPolicyMode.MANDATORY,
      },
      actorUserId: 'club-admin-1',
      actorRole: 'ADMIN',
      reason: "Le club veut forcer l'email marketing",
    });

    const selection = await service.resolveChannelSelection(
      'team-1',
      'MARKETING',
      'MARKETING',
      [NotificationChannelType.EMAIL, NotificationChannelType.SMS],
    );
    expect(selection.mandatory).toEqual([NotificationChannelType.EMAIL]);
    expect(selection.disabled).toEqual([NotificationChannelType.SMS]);
    expect(auditRows).toHaveLength(2);
  });

  it('does not leak a CLUB override configured for another club', async () => {
    const service = buildService([], []);
    await service.upsert({
      scopeType: 'CLUB',
      scopeId: 'team-1',
      category: 'MARKETING',
      channels: {
        [NotificationChannelType.EMAIL]: ChannelPolicyMode.MANDATORY,
      },
      actorUserId: 'club-admin-1',
      actorRole: 'ADMIN',
      reason: 'Override club 1',
    });

    const selection = await service.resolveChannelSelection(
      'team-2',
      'MARKETING',
      'MARKETING',
      [NotificationChannelType.EMAIL],
    );
    expect(selection.mandatory).toEqual([]);
    expect(selection.eligibleForPreference).toEqual([
      NotificationChannelType.EMAIL,
    ]);
  });

  it('legacy mandatory notification types stay mandatory even when the policy says DEFAULT', async () => {
    const service = buildService([], []);
    const selection = await service.resolveChannelSelection(
      'team-1',
      'PAYMENT_SUCCEEDED',
      'PAYMENT',
      [NotificationChannelType.EMAIL],
    );
    expect(selection.mandatory).toEqual([NotificationChannelType.EMAIL]);
  });

  it('falls back to a category wildcard (category IS NULL) when no exact-category record exists', async () => {
    const service = buildService([], []);
    await service.upsert({
      scopeType: 'PLATFORM',
      scopeId: null,
      category: null,
      channels: { [NotificationChannelType.SMS]: ChannelPolicyMode.DISABLED },
      actorUserId: 'admin-1',
      actorRole: 'SUPERADMIN',
      reason: 'Désactive SMS partout par défaut',
    });

    const selection = await service.resolveChannelSelection(
      'team-1',
      'ANY_TYPE',
      'ANY_CATEGORY',
      [NotificationChannelType.SMS],
    );
    expect(selection.disabled).toEqual([NotificationChannelType.SMS]);
  });

  it('explains DEFAULT, PLATFORM and CLUB provenance for the effective category policy', async () => {
    const service = buildService([], []);
    await service.upsert({
      scopeType: 'PLATFORM',
      scopeId: null,
      category: 'MARKETING',
      channels: { [NotificationChannelType.SMS]: ChannelPolicyMode.DISABLED },
      effectiveFrom: new Date('2026-08-01T00:00:00Z'),
      actorUserId: 'platform-admin',
      actorRole: 'SUPERADMIN',
      reason: 'Disable marketing SMS platform-wide',
    });
    await service.upsert({
      scopeType: 'CLUB',
      scopeId: 'team-1',
      category: 'MARKETING',
      channels: {
        [NotificationChannelType.EMAIL]: ChannelPolicyMode.MANDATORY,
      },
      effectiveFrom: new Date('2026-08-10T00:00:00Z'),
      actorUserId: 'club-admin',
      actorRole: 'ADMIN',
      reason: 'Force email for club marketing',
    });

    const explained = await service.resolveExplained(
      'team-1',
      'MARKETING',
      new Date('2026-08-19T00:00:00Z'),
    );

    expect(explained.values[NotificationChannelType.EMAIL]).toBe(
      ChannelPolicyMode.MANDATORY,
    );
    expect(explained.sources[NotificationChannelType.EMAIL]).toMatchObject({
      kind: 'POLICY',
      scopeType: 'CLUB',
      scopeId: 'team-1',
      version: 1,
      effectiveFrom: new Date('2026-08-10T00:00:00Z'),
    });
    expect(explained.sources[NotificationChannelType.SMS]).toMatchObject({
      kind: 'POLICY',
      scopeType: 'PLATFORM',
      scopeId: null,
      version: 1,
      effectiveFrom: new Date('2026-08-01T00:00:00Z'),
    });
    expect(explained.sources[NotificationChannelType.PUSH]).toEqual({
      kind: 'DEFAULT',
    });
  });

  it('increments the version and keeps history on repeated upserts of the same scope/category', async () => {
    const rows: NotificationPolicy[] = [];
    const service = buildService(rows, []);
    await service.upsert({
      scopeType: 'PLATFORM',
      scopeId: null,
      category: 'PAYMENT',
      channels: { [NotificationChannelType.EMAIL]: ChannelPolicyMode.DEFAULT },
      actorUserId: 'admin-1',
      actorRole: 'SUPERADMIN',
      reason: 'first version',
    });
    const second = await service.upsert({
      scopeType: 'PLATFORM',
      scopeId: null,
      category: 'PAYMENT',
      channels: {
        [NotificationChannelType.EMAIL]: ChannelPolicyMode.MANDATORY,
      },
      actorUserId: 'admin-1',
      actorRole: 'SUPERADMIN',
      reason: 'second version',
    });
    expect(second.version).toBe(2);
    expect(rows).toHaveLength(2);
  });
});
