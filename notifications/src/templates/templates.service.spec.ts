import { EntityManager } from 'typeorm';
import { NotificationChannelType } from '../common/enums/channel.enum';
import { NotificationLocale } from '../common/enums/locale.enum';
import { TemplateStatus } from '../common/enums/template-status.enum';
import { NotificationPolicyAudit } from '../policy/entities/notification-policy-audit.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { TemplatesService } from './templates.service';

function buildRepository(rows: NotificationTemplate[]) {
  let seq = rows.length;
  return {
    find: (options?: { where?: Partial<NotificationTemplate> }) =>
      Promise.resolve(matchRows(rows, options?.where)),
    findOne: (options: { where: Partial<NotificationTemplate> }) =>
      Promise.resolve(matchRows(rows, options.where)[0] ?? null),
    create: (data: Partial<NotificationTemplate>) =>
      ({ id: `tpl-${++seq}`, ...data }) as NotificationTemplate,
    save: (row: NotificationTemplate) => {
      const index = rows.findIndex((r) => r.id === row.id);
      if (index >= 0) rows[index] = row;
      else rows.push(row);
      return Promise.resolve(row);
    },
  };
}

function matchRows(
  rows: NotificationTemplate[],
  where?: Partial<NotificationTemplate>,
): NotificationTemplate[] {
  if (!where) return rows;
  return rows.filter((row) =>
    Object.entries(where).every(
      ([key, value]) => (row as never)[key] === value,
    ),
  );
}

function buildService(rows: NotificationTemplate[], auditRows: unknown[]) {
  const repository = buildRepository(rows);
  const auditRepository = {
    create: (data: unknown) => data,
    save: (row: unknown) => {
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

  return new TemplatesService(
    dataSource as never,
    repository as never,
    auditRepository as never,
  );
}

describe('TemplatesService workflow (NOTIF-005)', () => {
  it('walks a template through DRAFT -> SUBMITTED -> APPROVED -> ACTIVE', async () => {
    const rows: NotificationTemplate[] = [];
    const auditRows: unknown[] = [];
    const service = buildService(rows, auditRows);

    const draft = await service.createDraft(
      'MATCH_REMINDER',
      NotificationChannelType.EMAIL,
      NotificationLocale.FR,
      { subject: 'Rappel', body: 'Le match commence bientôt' },
      'user-author',
    );
    expect(draft.status).toBe(TemplateStatus.DRAFT);
    expect(draft.version).toBe(1);

    const submitted = await service.submit(draft.id, 'user-author');
    expect(submitted.status).toBe(TemplateStatus.SUBMITTED);

    const approved = await service.approve(draft.id, {
      userId: 'user-reviewer',
      role: 'SUPERADMIN',
      reason: 'Contenu vérifié',
    });
    expect(approved.status).toBe(TemplateStatus.APPROVED);
    expect(approved.approvedBy).toBe('user-reviewer');

    const active = await service.activate(draft.id, {
      userId: 'user-reviewer',
      role: 'SUPERADMIN',
      reason: 'Mise en production',
    });
    expect(active.status).toBe(TemplateStatus.ACTIVE);
    expect(active.activatedAt).not.toBeNull();
    expect(auditRows.length).toBeGreaterThan(0);
  });

  it('rejects self-approval by the submitter (maker/checker)', async () => {
    const rows: NotificationTemplate[] = [];
    const service = buildService(rows, []);

    const draft = await service.createDraft(
      'MATCH_REMINDER',
      NotificationChannelType.EMAIL,
      NotificationLocale.FR,
      { body: 'x' },
      'user-author',
    );
    await service.submit(draft.id, 'user-author');

    await expect(
      service.approve(draft.id, {
        userId: 'user-author',
        role: 'ADMIN',
        reason: 'auto-approve',
      }),
    ).rejects.toThrow('cannot approve');
  });

  it('archives the previous ACTIVE version when a new version is activated', async () => {
    const rows: NotificationTemplate[] = [];
    const service = buildService(rows, []);

    const v1 = await service.createDraft(
      'MATCH_REMINDER',
      NotificationChannelType.EMAIL,
      NotificationLocale.FR,
      { body: 'v1' },
      'user-author',
    );
    await service.submit(v1.id, 'user-author');
    await service.approve(v1.id, {
      userId: 'user-reviewer',
      role: 'SUPERADMIN',
      reason: 'validated',
    });
    await service.activate(v1.id, {
      userId: 'user-reviewer',
      role: 'SUPERADMIN',
      reason: 'go live',
    });

    const v2 = await service.createDraft(
      'MATCH_REMINDER',
      NotificationChannelType.EMAIL,
      NotificationLocale.FR,
      { body: 'v2' },
      'user-author',
    );
    expect(v2.version).toBe(2);
    await service.submit(v2.id, 'user-author');
    await service.approve(v2.id, {
      userId: 'user-reviewer',
      role: 'SUPERADMIN',
      reason: 'validated',
    });
    await service.activate(v2.id, {
      userId: 'user-reviewer',
      role: 'SUPERADMIN',
      reason: 'go live v2',
    });

    const active = rows.filter((r) => r.status === TemplateStatus.ACTIVE);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(v2.id);
    const v1Reloaded = rows.find((r) => r.id === v1.id)!;
    expect(v1Reloaded.status).toBe(TemplateStatus.ARCHIVED);
  });

  it('rejects transitions outside the whitelist', async () => {
    const rows: NotificationTemplate[] = [];
    const service = buildService(rows, []);

    const draft = await service.createDraft(
      'MATCH_REMINDER',
      NotificationChannelType.EMAIL,
      NotificationLocale.FR,
      { body: 'x' },
      'user-author',
    );

    await expect(
      service.approve(draft.id, {
        userId: 'user-reviewer',
        role: 'SUPERADMIN',
        reason: 'skip states',
      }),
    ).rejects.toThrow('Cannot approve');
    await expect(
      service.activate(draft.id, {
        userId: 'user-reviewer',
        role: 'SUPERADMIN',
        reason: 'skip states',
      }),
    ).rejects.toThrow('Cannot activate');
  });
});
