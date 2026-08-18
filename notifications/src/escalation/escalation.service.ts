import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPriority } from '../common/enums/priority.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { Notification } from '../notifications/entities/notification.entity';
import { SharedDirectoryService } from '../database/shared-directory.service';
import { EscalationPolicyService } from './escalation-policy.service';
import { NotificationEscalation } from './entities/notification-escalation.entity';

const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * NOTIF-004 : escalade les notifications critiques (priority HIGH/URGENT)
 * non lues au-delà du délai configuré (EscalationPolicyService) vers un
 * destinataire de secours. L'insertion de `NotificationEscalation` sert de
 * verrou d'idempotence (contrainte unique sur `notificationId`) : elle est
 * effectuée AVANT l'envoi, comme `IdempotencyService.withIdempotency`.
 */
@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationEscalation)
    private readonly escalationRepository: Repository<NotificationEscalation>,
    private readonly escalationPolicy: EscalationPolicyService,
    private readonly directory: SharedDirectoryService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async sweep(now: Date = new Date()): Promise<number> {
    const lookback = new Date(now.getTime() - LOOKBACK_MS);
    const candidates = await this.notificationRepository
      .createQueryBuilder('n')
      .leftJoin(NotificationEscalation, 'e', 'e.notification_id = n.id')
      .where('n.read_at IS NULL')
      .andWhere('n.priority IN (:...priorities)', {
        priorities: [NotificationPriority.HIGH, NotificationPriority.URGENT],
      })
      .andWhere('(n.expires_at IS NULL OR n.expires_at > :now)', { now })
      .andWhere('n.created_at >= :lookback', { lookback })
      .andWhere('e.id IS NULL')
      .getMany();

    let escalated = 0;
    for (const candidate of candidates) {
      const didEscalate = await this.escalateIfDue(candidate, now);
      if (didEscalate) escalated += 1;
    }
    if (escalated > 0) {
      this.logger.log(
        `Escalated ${escalated} unread critical notification(s).`,
      );
    }
    return escalated;
  }

  private async escalateIfDue(
    notification: Notification,
    now: Date,
  ): Promise<boolean> {
    const policy = await this.escalationPolicy.resolve(
      notification.teamId,
      notification.category,
      now,
    );
    if (!policy.enabled) return false;

    const dueAt =
      notification.createdAt.getTime() + policy.delayMinutes * 60_000;
    if (now.getTime() < dueAt) return false;

    // Revendication atomique : si un autre sweep a déjà inséré cette ligne,
    // la contrainte unique rejette l'insertion et on abandonne sans effet.
    try {
      await this.escalationRepository.insert({
        notificationId: notification.id,
        backupUserId: null,
        escalatedNotificationId: null,
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) return false;
      throw error;
    }

    const backupUserIds = await this.resolveBackupRecipients(
      notification,
      policy,
    );
    if (backupUserIds.length === 0) {
      this.logger.warn(
        `Escalation policy for category=${notification.category} is enabled but no backup recipient could be resolved (notification ${notification.id})`,
      );
      return true;
    }

    const escalatedIds: string[] = [];
    for (const backupUserId of backupUserIds) {
      const result = await this.notificationsService.dispatchEvent(
        'notifications',
        {
          type: 'NOTIFICATION_ESCALATED',
          userId: backupUserId,
          teamId: notification.teamId ?? undefined,
          category: 'ESCALATION',
          priority: NotificationPriority.URGENT,
          title: 'Notification critique non lue',
          body: `"${notification.title}" est restée sans lecture plus de ${policy.delayMinutes} minute(s).`,
          data: { originalNotificationId: notification.id },
        },
      );
      escalatedIds.push(...result.notificationIds);
    }

    await this.escalationRepository.update(
      { notificationId: notification.id },
      {
        backupUserId: backupUserIds[0],
        escalatedNotificationId: escalatedIds[0] ?? null,
      },
    );
    return true;
  }

  private async resolveBackupRecipients(
    notification: Notification,
    policy: { backupUserId: string | null; backupRole: string | null },
  ): Promise<string[]> {
    if (policy.backupUserId) return [policy.backupUserId];
    if (policy.backupRole && this.directory.isEnabled()) {
      return this.directory.findActiveUserIdsByRole(
        policy.backupRole,
        notification.teamId ?? undefined,
      );
    }
    return [];
  }

  private isDuplicateKeyError(error: unknown): boolean {
    const err = error as {
      code?: string;
      driverError?: { code?: string; errno?: number };
    };
    return (
      err?.code === 'ER_DUP_ENTRY' ||
      err?.driverError?.code === 'ER_DUP_ENTRY' ||
      err?.driverError?.errno === 1062
    );
  }
}
