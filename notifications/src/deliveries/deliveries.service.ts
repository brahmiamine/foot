import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, MoreThanOrEqual, Repository } from 'typeorm';
import { NotificationChannelType } from '../common/enums/channel.enum';
import { DeliveryStatus } from '../common/enums/delivery-status.enum';
import { NotificationDelivery } from './entities/notification-delivery.entity';

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectRepository(NotificationDelivery)
    private readonly repository: Repository<NotificationDelivery>,
  ) {}

  /** `manager`, si fourni, rattache l'écriture à la transaction en cours (§P0-017). */
  private repo(manager?: EntityManager): Repository<NotificationDelivery> {
    return manager
      ? manager.getRepository(NotificationDelivery)
      : this.repository;
  }

  async createPending(
    notificationId: string,
    channel: NotificationChannelType,
    manager?: EntityManager,
  ): Promise<NotificationDelivery> {
    const repo = this.repo(manager);
    const delivery = repo.create({
      notificationId,
      channel,
      status: DeliveryStatus.PENDING,
      attempt: 0,
    });
    return repo.save(delivery);
  }

  async markAttempt(id: string, provider: string | null): Promise<void> {
    await this.repository.increment({ id }, 'attempt', 1);
    if (provider) await this.repository.update(id, { provider });
  }

  async markSent(
    id: string,
    provider?: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.repo(manager).update(id, {
      status: DeliveryStatus.SENT,
      sentAt: new Date(),
      ...(provider ? { provider } : {}),
    });
  }

  async markDelivered(id: string, manager?: EntityManager): Promise<void> {
    await this.repo(manager).update(id, {
      status: DeliveryStatus.DELIVERED,
      deliveredAt: new Date(),
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.repository.update(id, {
      status: DeliveryStatus.FAILED,
      error: error.slice(0, 2000),
    });
  }

  async markSkipped(id: string, reason: string): Promise<void> {
    await this.repository.update(id, {
      status: DeliveryStatus.SKIPPED,
      error: reason.slice(0, 2000),
    });
  }

  async findByNotification(
    notificationId: string,
  ): Promise<NotificationDelivery[]> {
    return this.repository.find({
      where: { notificationId },
      order: { createdAt: 'ASC' },
    });
  }

  async countByStatus(status: DeliveryStatus, since?: Date): Promise<number> {
    return this.repository.count({
      where: since ? { status, createdAt: MoreThanOrEqual(since) } : { status },
    });
  }

  getRepository(): Repository<NotificationDelivery> {
    return this.repository;
  }
}
