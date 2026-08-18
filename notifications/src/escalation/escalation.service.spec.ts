import { NotificationChannelType } from '../common/enums/channel.enum';
import { NotificationPriority } from '../common/enums/priority.enum';
import { Notification } from '../notifications/entities/notification.entity';
import { EscalationService } from './escalation.service';
import { NotificationEscalation } from './entities/notification-escalation.entity';

function buildNotification(overrides: Partial<Notification>): Notification {
  return {
    id: 'notif-1',
    userId: 'user-1',
    teamId: 'team-1',
    application: 'notifications',
    type: 'SECURITY_ALERT',
    category: 'SECURITY_ALERT',
    priority: NotificationPriority.URGENT,
    title: 'Alerte',
    body: 'Un évènement critique',
    data: null,
    channels: [NotificationChannelType.IN_APP],
    mandatory: false,
    notificationEventId: null,
    readAt: null,
    expiresAt: null,
    scheduledAt: null,
    createdAt: new Date('2026-01-15T10:00:00.000Z'),
    updatedAt: new Date('2026-01-15T10:00:00.000Z'),
    ...overrides,
  };
}

function buildService(options: {
  candidate: Notification | null;
  resolvedPolicy: {
    enabled: boolean;
    delayMinutes: number;
    backupUserId: string | null;
    backupRole: string | null;
  };
  existingEscalations?: Set<string>;
}) {
  const escalationRows = new Map<string, NotificationEscalation>();
  for (const id of options.existingEscalations ?? []) {
    escalationRows.set(id, {
      id,
      notificationId: id,
      backupUserId: null,
      escalatedNotificationId: null,
      escalatedAt: new Date(),
    });
  }

  const notificationRepository = {
    createQueryBuilder: () => {
      const qb = {
        leftJoin: () => qb,
        where: () => qb,
        andWhere: () => qb,
        getMany: () =>
          Promise.resolve(
            options.candidate && !escalationRows.has(options.candidate.id)
              ? [options.candidate]
              : [],
          ),
      };
      return qb;
    },
  };

  const escalationRepository = {
    insert: jest.fn((row: { notificationId: string }) => {
      if (escalationRows.has(row.notificationId)) {
        const error = new Error('Duplicate') as Error & {
          driverError: { errno: number; code: string };
        };
        error.driverError = { errno: 1062, code: 'ER_DUP_ENTRY' };
        throw error;
      }
      escalationRows.set(row.notificationId, {
        id: row.notificationId,
        notificationId: row.notificationId,
        backupUserId: null,
        escalatedNotificationId: null,
        escalatedAt: new Date(),
      });
      return Promise.resolve({});
    }),
    update: jest.fn(
      (
        where: { notificationId: string },
        patch: Partial<NotificationEscalation>,
      ) => {
        const row = escalationRows.get(where.notificationId);
        if (row) Object.assign(row, patch);
        return Promise.resolve({});
      },
    ),
  };

  const escalationPolicyService = {
    resolve: jest.fn(() => Promise.resolve(options.resolvedPolicy)),
  };

  const directory = {
    isEnabled: () => true,
    findActiveUserIdsByRole: jest.fn(() => Promise.resolve(['role-backup-1'])),
  };

  const dispatchEvent = jest.fn(() =>
    Promise.resolve({
      notificationIds: ['escalated-notif-1'],
      deduplicated: false,
    }),
  );
  const notificationsService = { dispatchEvent };

  const service = new EscalationService(
    notificationRepository as never,
    escalationRepository as never,
    escalationPolicyService as never,
    directory as never,
    notificationsService as never,
  );
  return { service, escalationRepository, dispatchEvent, escalationRows };
}

describe('EscalationService (NOTIF-004)', () => {
  it('does nothing when the policy is disabled', async () => {
    const candidate = buildNotification({});
    const { service, dispatchEvent } = buildService({
      candidate,
      resolvedPolicy: {
        enabled: false,
        delayMinutes: 30,
        backupUserId: null,
        backupRole: null,
      },
    });

    const escalated = await service.sweep(new Date('2026-01-15T11:00:00.000Z'));
    expect(escalated).toBe(0);
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it('does not escalate before the configured delay has elapsed', async () => {
    const candidate = buildNotification({});
    const { service, dispatchEvent } = buildService({
      candidate,
      resolvedPolicy: {
        enabled: true,
        delayMinutes: 30,
        backupUserId: 'backup-user',
        backupRole: null,
      },
    });

    // 10 minutes after creation, delay is 30 minutes.
    const escalated = await service.sweep(new Date('2026-01-15T10:10:00.000Z'));
    expect(escalated).toBe(0);
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it('escalates to the explicit backup user once the delay has elapsed', async () => {
    const candidate = buildNotification({});
    const { service, dispatchEvent, escalationRows } = buildService({
      candidate,
      resolvedPolicy: {
        enabled: true,
        delayMinutes: 30,
        backupUserId: 'backup-user',
        backupRole: null,
      },
    });

    const escalated = await service.sweep(new Date('2026-01-15T10:31:00.000Z'));
    expect(escalated).toBe(1);
    expect(dispatchEvent).toHaveBeenCalledWith(
      'notifications',
      expect.objectContaining({
        userId: 'backup-user',
        type: 'NOTIFICATION_ESCALATED',
      }),
    );
    expect(escalationRows.get('notif-1')?.escalatedNotificationId).toBe(
      'escalated-notif-1',
    );
  });

  it('resolves a backupRole against the notification club when no explicit backupUserId is set', async () => {
    const candidate = buildNotification({});
    const { service, dispatchEvent } = buildService({
      candidate,
      resolvedPolicy: {
        enabled: true,
        delayMinutes: 30,
        backupUserId: null,
        backupRole: 'ADMIN',
      },
    });

    await service.sweep(new Date('2026-01-15T10:31:00.000Z'));
    expect(dispatchEvent).toHaveBeenCalledWith(
      'notifications',
      expect.objectContaining({ userId: 'role-backup-1' }),
    );
  });

  it('never escalates the same notification twice (idempotent sweep)', async () => {
    const candidate = buildNotification({});
    const { service, dispatchEvent } = buildService({
      candidate,
      resolvedPolicy: {
        enabled: true,
        delayMinutes: 30,
        backupUserId: 'backup-user',
        backupRole: null,
      },
    });

    await service.sweep(new Date('2026-01-15T10:31:00.000Z'));
    // Second sweep: the query builder mock itself excludes already-escalated
    // notifications (LEFT JOIN ... WHERE e.id IS NULL), so this simulates
    // the real SQL guard rather than relying only on the insert race.
    const secondRun = await service.sweep(new Date('2026-01-15T11:00:00.000Z'));
    expect(secondRun).toBe(0);
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
  });
});
