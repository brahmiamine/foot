import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  LessThanOrEqual,
  Repository,
} from 'typeorm';
import { NotificationChannelType } from '../common/enums/channel.enum';
import { DigestMode } from '../common/enums/digest-mode.enum';
import { NotificationPriority } from '../common/enums/priority.enum';
import { DeliveriesService } from '../deliveries/deliveries.service';
import { Notification } from '../notifications/entities/notification.entity';
import { QueueDispatchProducer } from '../queue/dispatch.producer';
import { DigestQueueEntry } from './entities/digest-queue-entry.entity';

const BUCKET_DURATION_MS: Partial<Record<DigestMode, number>> = {
  [DigestMode.HOURLY]: 60 * 60_000,
  [DigestMode.DAILY]: 24 * 60 * 60_000,
};

function bucketStart(mode: DigestMode, at: Date): Date {
  const durationMs = BUCKET_DURATION_MS[mode];
  if (!durationMs) return at;
  return new Date(Math.floor(at.getTime() / durationMs) * durationMs);
}

interface DigestGroup {
  userId: string;
  channel: NotificationChannelType;
  mode: DigestMode;
  windowStart: Date;
  entries: DigestQueueEntry[];
}

/**
 * NOTIF-003 : agrégation IMMEDIATE/HOURLY/DAILY. `enqueue` remplace l'envoi
 * immédiat d'un canal non-IN_APP par une ligne en file ; `flushDue`, piloté
 * par cron (voir DigestFlushService), revendique atomiquement chaque fenêtre
 * close puis crée UNE notification agrégée par (utilisateur, canal, fenêtre).
 */
@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(DigestQueueEntry)
    private readonly repository: Repository<DigestQueueEntry>,
    private readonly deliveries: DeliveriesService,
    private readonly dispatchProducer: QueueDispatchProducer,
  ) {}

  async enqueue(
    userId: string,
    channel: NotificationChannelType,
    mode: DigestMode,
    notificationId: string,
    deliveryId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(DigestQueueEntry)
      : this.repository;
    await repo.save(
      repo.create({
        userId,
        channel,
        mode,
        windowStart: bucketStart(mode, new Date()),
        notificationId,
        deliveryId,
        flushed: false,
      }),
    );
    await this.deliveries.markSkipped(
      deliveryId,
      `Aggregated into ${mode} digest (see notification_digest_queue)`,
    );
  }

  /** Revendique et agrège toutes les fenêtres `mode` closes avant `now`. */
  async flushDue(mode: DigestMode, now: Date = new Date()): Promise<number> {
    const durationMs = BUCKET_DURATION_MS[mode];
    if (!durationMs) return 0;
    const cutoff = new Date(now.getTime() - durationMs);

    const pending = await this.repository.find({
      where: { mode, flushed: false, windowStart: LessThanOrEqual(cutoff) },
    });
    if (pending.length === 0) return 0;

    const groups = new Map<string, DigestGroup>();
    for (const entry of pending) {
      const key = `${entry.userId}::${entry.channel}::${entry.windowStart.toISOString()}`;
      const group = groups.get(key);
      if (group) {
        group.entries.push(entry);
      } else {
        groups.set(key, {
          userId: entry.userId,
          channel: entry.channel,
          mode,
          windowStart: entry.windowStart,
          entries: [entry],
        });
      }
    }

    let flushedGroups = 0;
    for (const group of groups.values()) {
      const flushed = await this.flushGroup(group);
      if (flushed) flushedGroups += 1;
    }
    if (flushedGroups > 0) {
      this.logger.log(`Flushed ${flushedGroups} ${mode} digest group(s).`);
    }
    return flushedGroups;
  }

  /** Revendique atomiquement un groupe ; renvoie false si un autre run l'a déjà traité (idempotence). */
  private async flushGroup(group: DigestGroup): Promise<boolean> {
    // Le job BullMQ n'est mis en file qu'après commit (voir NotificationsService),
    // pour ne jamais référencer une notification dont l'écriture serait annulée.
    const toEnqueue = await this.dataSource.transaction(async (manager) => {
      const ids = group.entries.map((entry) => entry.id);
      const claim = await manager
        .getRepository(DigestQueueEntry)
        .createQueryBuilder()
        .update(DigestQueueEntry)
        .set({ flushed: true })
        .where('id IN (:...ids)', { ids })
        .andWhere('flushed = false')
        .execute();
      const claimedCount = claim.affected ?? 0;
      if (claimedCount === 0) return null;

      const notifications = await manager.getRepository(Notification).find({
        where: { id: In(group.entries.map((entry) => entry.notificationId)) },
      });
      if (notifications.length === 0) return undefined;

      const digest = manager.getRepository(Notification).create({
        userId: group.userId,
        teamId: null,
        application: 'notifications',
        type: 'DIGEST',
        category: 'DIGEST',
        priority: NotificationPriority.NORMAL,
        title: `${notifications.length} notification(s) en attente`,
        body: notifications.map((n) => `- ${n.title}`).join('\n'),
        data: {
          notificationIds: notifications.map((n) => n.id),
          mode: group.mode,
        },
        channels: [group.channel],
        mandatory: false,
        notificationEventId: null,
        readAt: null,
        expiresAt: null,
        scheduledAt: null,
      });
      const savedDigest = await manager
        .getRepository(Notification)
        .save(digest);
      const delivery = await this.deliveries.createPending(
        savedDigest.id,
        group.channel,
        manager,
      );
      return { notificationId: savedDigest.id, deliveryId: delivery.id };
    });

    if (toEnqueue === null) return false; // déjà revendiqué par un autre run
    if (toEnqueue) {
      await this.dispatchProducer.enqueue(
        group.channel,
        toEnqueue.notificationId,
        toEnqueue.deliveryId,
        0,
      );
    }
    return true;
  }
}
