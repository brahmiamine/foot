import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, LessThanOrEqual, Repository } from 'typeorm';
import { PaginatedResult, PaginationDto } from '../common/dto/pagination.dto';
import { NotificationChannelType } from '../common/enums/channel.enum';
import { NotificationPriority } from '../common/enums/priority.enum';
import { DeliveriesService } from '../deliveries/deliveries.service';
import { DigestService } from '../digest/digest.service';
import { IdempotencyService } from '../events/idempotency.service';
import { CreateInternalNotificationDto } from '../internal/dto/create-internal-notification.dto';
import { DigestMode } from '../common/enums/digest-mode.enum';
import { PreferencesService } from '../preferences/preferences.service';
import {
  computeQuietHoursDelayMs,
  type UserNotificationSchedule,
} from '../preferences/quiet-hours.util';
import { PolicyService } from '../policy/policy.service';
import { QueueDispatchProducer } from '../queue/dispatch.producer';
import { Notification } from './entities/notification.entity';
import { RecipientResolverService } from './recipient-resolver.service';

const DEFAULT_CANDIDATE_CHANNELS = [
  NotificationChannelType.IN_APP,
  NotificationChannelType.EMAIL,
  NotificationChannelType.PUSH,
];

export interface DispatchResult {
  notificationIds: string[];
  deduplicated: boolean;
}

interface EnqueueTask {
  channel: NotificationChannelType;
  notificationId: string;
  deliveryId: string;
  delayMs: number;
}

interface CreatedNotification {
  notification: Notification;
  toEnqueue: EnqueueTask[];
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
    private readonly deliveries: DeliveriesService,
    private readonly preferences: PreferencesService,
    private readonly idempotency: IdempotencyService,
    private readonly recipientResolver: RecipientResolverService,
    private readonly dispatchProducer: QueueDispatchProducer,
    private readonly policy: PolicyService,
    private readonly digest: DigestService,
  ) {}

  async dispatchEvent(
    application: string,
    dto: CreateInternalNotificationDto,
  ): Promise<DispatchResult> {
    const { userIds, teamId } = await this.recipientResolver.resolve(dto);
    const uniqueUserIds = [...new Set(userIds)];

    if (!dto.eventId) {
      const created = await this.createMany(
        application,
        dto,
        uniqueUserIds,
        teamId,
      );
      await this.enqueueAll(created);
      return {
        notificationIds: created.map((c) => c.notification.id),
        deduplicated: false,
      };
    }

    let created: CreatedNotification[] = [];
    const result = await this.idempotency.withIdempotency(
      application,
      dto.eventId,
      dto.type,
      async (manager) => {
        created = await this.createMany(
          application,
          dto,
          uniqueUserIds,
          teamId,
          manager,
        );
        return created.map((c) => c.notification.id);
      },
    );

    if (!result.deduplicated) {
      await this.enqueueAll(created);
    }

    return result;
  }

  private async createMany(
    application: string,
    dto: CreateInternalNotificationDto,
    userIds: string[],
    teamId: string | null,
    manager?: EntityManager,
  ): Promise<CreatedNotification[]> {
    const created: CreatedNotification[] = [];
    for (const userId of userIds) {
      created.push(
        await this.createOne(application, dto, userId, teamId, manager),
      );
    }
    return created;
  }

  private async enqueueAll(created: CreatedNotification[]): Promise<void> {
    for (const { toEnqueue } of created) {
      for (const task of toEnqueue) {
        await this.dispatchProducer.enqueue(
          task.channel,
          task.notificationId,
          task.deliveryId,
          task.delayMs,
        );
      }
    }
  }

  private async createOne(
    application: string,
    dto: CreateInternalNotificationDto,
    userId: string,
    teamId: string | null,
    manager?: EntityManager,
  ): Promise<CreatedNotification> {
    const notificationRepo = manager
      ? manager.getRepository(Notification)
      : this.repository;

    const category = dto.category ?? dto.type;
    const externalEmail = dto.email?.trim().toLowerCase() ?? null;
    const candidateChannels = externalEmail
      ? [NotificationChannelType.EMAIL]
      : (dto.channels ?? DEFAULT_CANDIDATE_CHANNELS);
    const priority = dto.priority ?? NotificationPriority.NORMAL;
    const isUrgent = priority === NotificationPriority.URGENT;

    // NOTIF-001 : un destinataire externe (email brut, sans compte) n'a ni
    // préférences ni horaire — il reçoit toujours ses canaux candidats.
    let channels: NotificationChannelType[];
    let mandatoryChannels: NotificationChannelType[] = [];
    let schedule: UserNotificationSchedule | null = null;
    if (externalEmail) {
      channels = candidateChannels;
    } else {
      const selection = await this.policy.resolveChannelSelection(
        teamId,
        dto.type,
        category,
        candidateChannels,
      );
      mandatoryChannels = selection.mandatory;
      const preferenceEnabled = await this.preferences.resolveEnabledChannels(
        userId,
        category,
        selection.eligibleForPreference,
      );
      const enabledSet = new Set([
        ...selection.mandatory,
        ...preferenceEnabled,
      ]);
      channels = candidateChannels.filter((channel) => enabledSet.has(channel));
      schedule = await this.preferences.getSchedule(userId);
    }
    const mandatory = mandatoryChannels.length > 0;
    const notificationData = externalEmail
      ? {
          ...(dto.data ?? {}),
          _externalEmail: externalEmail,
          _externalName: dto.recipientName ?? null,
        }
      : (dto.data ?? null);

    const notification = notificationRepo.create({
      userId,
      teamId,
      application,
      type: dto.type,
      category,
      priority,
      title: dto.title,
      body: dto.body,
      data: notificationData,
      channels,
      mandatory,
      notificationEventId: null,
      readAt: null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
    });
    const saved = await notificationRepo.save(notification);

    // NOTIF-002 : les notifications URGENT contournent les heures calmes ;
    // les autres sont différées jusqu'à leur fin (voir computeQuietHoursDelayMs).
    const baseAt = saved.scheduledAt ?? new Date();
    let sendDelayMs = Math.max(0, baseAt.getTime() - Date.now());
    if (!isUrgent && schedule) {
      const plannedSendAt = new Date(Date.now() + sendDelayMs);
      sendDelayMs += computeQuietHoursDelayMs(schedule, plannedSendAt);
    }

    const toEnqueue: EnqueueTask[] = [];
    for (const channel of channels) {
      const delivery = await this.deliveries.createPending(
        saved.id,
        channel,
        manager,
      );
      if (channel === NotificationChannelType.IN_APP) {
        await this.deliveries.markSent(delivery.id, 'in-app', manager);
        await this.deliveries.markDelivered(delivery.id, manager);
        continue;
      }

      // NOTIF-003 : un canal MANDATORY ou une notification URGENT reste
      // toujours immédiat — seul le flux "préférence" peut être digéré.
      const isMandatoryChannel = mandatoryChannels.includes(channel);
      const digestMode =
        schedule && !isMandatoryChannel && !isUrgent
          ? schedule.digestMode
          : DigestMode.IMMEDIATE;
      if (digestMode !== DigestMode.IMMEDIATE) {
        await this.digest.enqueue(
          userId,
          channel,
          digestMode,
          saved.id,
          delivery.id,
          manager,
        );
        continue;
      }

      toEnqueue.push({
        channel,
        notificationId: saved.id,
        deliveryId: delivery.id,
        delayMs: sendDelayMs,
      });
    }

    return { notification: saved, toEnqueue };
  }

  async findForUser(
    userId: string,
    pagination: PaginationDto,
    unreadOnly = false,
  ): Promise<PaginatedResult<Notification>> {
    const now = new Date();
    const qb = this.repository
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId })
      .andWhere('(n.scheduled_at IS NULL OR n.scheduled_at <= :now)', { now })
      .andWhere('(n.expires_at IS NULL OR n.expires_at > :now)', { now });

    if (unreadOnly) {
      qb.andWhere('n.read_at IS NULL');
    }

    qb.orderBy('n.created_at', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async countUnread(userId: string): Promise<number> {
    const now = new Date();
    return this.repository
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId })
      .andWhere('n.read_at IS NULL')
      .andWhere('(n.scheduled_at IS NULL OR n.scheduled_at <= :now)', { now })
      .andWhere('(n.expires_at IS NULL OR n.expires_at > :now)', { now })
      .getCount();
  }

  async findOneForUser(userId: string, id: string): Promise<Notification> {
    const notification = await this.repository.findOne({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    return notification;
  }

  async markRead(userId: string, id: string): Promise<Notification> {
    const notification = await this.findOneForUser(userId, id);
    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.repository.save(notification);
    }
    return notification;
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('read_at IS NULL')
      .execute();
    return { updated: result.affected ?? 0 };
  }

  async remove(userId: string, id: string): Promise<void> {
    const notification = await this.findOneForUser(userId, id);
    await this.repository.delete(notification.id);
  }

  async findByIdOrThrow(id: string): Promise<Notification> {
    const notification = await this.repository.findOne({ where: { id } });
    if (!notification)
      throw new NotFoundException(`Notification ${id} not found`);
    return notification;
  }

  async deleteExpiredAndStale(retentionDays: number): Promise<number> {
    const now = new Date();
    const retentionCutoff = new Date(
      now.getTime() - retentionDays * 24 * 60 * 60 * 1000,
    );

    const expired = await this.repository.delete({
      expiresAt: LessThanOrEqual(now),
    });
    const stale = await this.repository.delete({
      createdAt: LessThanOrEqual(retentionCutoff),
    });
    return (expired.affected ?? 0) + (stale.affected ?? 0);
  }
}
