import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { NotificationChannelType } from '../common/enums/channel.enum';
import { NotificationPriority } from '../common/enums/priority.enum';
import { isMandatoryNotificationType } from '../common/constants/mandatory-types';
import { PaginatedResult, PaginationDto } from '../common/dto/pagination.dto';
import { DeliveriesService } from '../deliveries/deliveries.service';
import { IdempotencyService } from '../events/idempotency.service';
import { PreferencesService } from '../preferences/preferences.service';
import { QueueDispatchProducer } from '../queue/dispatch.producer';
import { CreateInternalNotificationDto } from '../internal/dto/create-internal-notification.dto';
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
  ) {}

  /**
   * Point d'entrée unique pour /internal/notifications (§20) : idempotence
   * (§19), résolution de cible (§22), application des préférences (§11),
   * bypass des types obligatoires (§12), persistance et mise en file des
   * canaux asynchrones (§17).
   */
  async dispatchEvent(
    application: string,
    dto: CreateInternalNotificationDto,
  ): Promise<DispatchResult> {
    if (dto.eventId) {
      const existing = await this.idempotency.findExisting(
        application,
        dto.eventId,
      );
      if (existing) {
        return {
          notificationIds: existing.notificationIds,
          deduplicated: true,
        };
      }
    }

    const { userIds, teamId } = await this.recipientResolver.resolve(dto);
    const uniqueUserIds = [...new Set(userIds)];

    const notificationIds: string[] = [];
    for (const userId of uniqueUserIds) {
      const notification = await this.createOne(
        application,
        dto,
        userId,
        teamId,
      );
      notificationIds.push(notification.id);
    }

    if (dto.eventId) {
      await this.idempotency.record(
        application,
        dto.eventId,
        dto.type,
        notificationIds,
      );
    }

    return { notificationIds, deduplicated: false };
  }

  private async createOne(
    application: string,
    dto: CreateInternalNotificationDto,
    userId: string,
    teamId: string | null,
  ): Promise<Notification> {
    const category = dto.category ?? dto.type;
    const mandatory = isMandatoryNotificationType(dto.type);
    const candidateChannels = dto.channels ?? DEFAULT_CANDIDATE_CHANNELS;
    const channels = mandatory
      ? candidateChannels
      : await this.preferences.resolveEnabledChannels(
          userId,
          category,
          candidateChannels,
        );

    const notification = this.repository.create({
      userId,
      teamId,
      application,
      type: dto.type,
      category,
      priority: dto.priority ?? NotificationPriority.NORMAL,
      title: dto.title,
      body: dto.body,
      data: dto.data ?? null,
      channels,
      mandatory,
      notificationEventId: null,
      readAt: null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
    });
    const saved = await this.repository.save(notification);

    const delayMs = saved.scheduledAt
      ? Math.max(0, saved.scheduledAt.getTime() - Date.now())
      : 0;

    for (const channel of channels) {
      const delivery = await this.deliveries.createPending(saved.id, channel);
      if (channel === NotificationChannelType.IN_APP) {
        // La ligne `notifications` est déjà la notification in-app (§10) : rien à mettre en file.
        await this.deliveries.markSent(delivery.id, { provider: 'in-app' });
        await this.deliveries.markDelivered(delivery.id);
        continue;
      }
      await this.dispatchProducer.enqueue(
        channel,
        saved.id,
        delivery.id,
        delayMs,
      );
    }

    return saved;
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
      // 404 plutôt que 403 pour ne pas confirmer l'existence d'une notification d'un autre utilisateur.
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

  /** Nettoyage périodique des notifications expirées/anciennes (§24, §27). */
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
