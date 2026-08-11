import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThanOrEqual, Repository } from 'typeorm';
import { DeliveryStatus } from '../common/enums/delivery-status.enum';
import { DeliveriesService } from '../deliveries/deliveries.service';
import { Notification } from '../notifications/entities/notification.entity';

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Alimente le dashboard technique superadmin (§26). */
@Injectable()
export class AdminStatsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    private readonly deliveries: DeliveriesService,
  ) {}

  async getStats() {
    const since = startOfToday();
    const deliveryRepo = this.deliveries.getRepository();

    const [
      notificationsToday,
      unreadTotal,
      failuresToday,
      retriesToday,
      byApplication,
      byChannel,
    ] = await Promise.all([
      this.notifications.count({
        where: { createdAt: MoreThanOrEqual(since) },
      }),
      this.notifications.count({ where: { readAt: IsNull() } }),
      deliveryRepo.count({
        where: {
          status: DeliveryStatus.FAILED,
          createdAt: MoreThanOrEqual(since),
        },
      }),
      deliveryRepo
        .createQueryBuilder('d')
        .where('d.attempt > 1')
        .andWhere('d.created_at >= :since', { since })
        .getCount(),
      this.notifications
        .createQueryBuilder('n')
        .select('n.application', 'application')
        .addSelect('COUNT(*)', 'count')
        .where('n.created_at >= :since', { since })
        .groupBy('n.application')
        .getRawMany<{ application: string; count: string }>(),
      deliveryRepo
        .createQueryBuilder('d')
        .select('d.channel', 'channel')
        .addSelect('d.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('d.created_at >= :since', { since })
        .groupBy('d.channel')
        .addGroupBy('d.status')
        .getRawMany<{ channel: string; status: string; count: string }>(),
    ]);

    return {
      since,
      notificationsToday,
      unreadTotal,
      failuresToday,
      retriesToday,
      byApplication: byApplication.map((row) => ({
        application: row.application,
        count: Number(row.count),
      })),
      byChannel: byChannel.map((row) => ({
        channel: row.channel,
        status: row.status,
        count: Number(row.count),
      })),
    };
  }
}
