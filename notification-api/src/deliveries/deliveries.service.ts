import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { NotificationChannelType } from '../common/enums/channel.enum';
import { DeliveryStatus } from '../common/enums/delivery-status.enum';
import { NotificationDelivery } from './entities/notification-delivery.entity';

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectRepository(NotificationDelivery)
    private readonly repository: Repository<NotificationDelivery>,
  ) {}

  async createPending(
    notificationId: string,
    channel: NotificationChannelType,
  ): Promise<NotificationDelivery> {
    const delivery = this.repository.create({
      notificationId,
      channel,
      status: DeliveryStatus.PENDING,
      attempt: 0,
    });
    return this.repository.save(delivery);
  }

  async markAttempt(id: string, provider: string | null): Promise<void> {
    await this.repository.increment({ id }, 'attempt', 1);
    if (provider) await this.repository.update(id, { provider });
  }

  async markSent(
    id: string,
    options?: {
      provider?: string;
      providerMessageId?: string;
      providerStatus?: string;
    },
  ): Promise<void> {
    await this.repository.update(id, {
      status: DeliveryStatus.SENT,
      sentAt: new Date(),
      ...(options?.provider ? { provider: options.provider } : {}),
      ...(options?.providerMessageId
        ? { providerMessageId: options.providerMessageId }
        : {}),
      ...(options?.providerStatus
        ? { providerStatus: options.providerStatus }
        : {}),
    });
  }

  async markDelivered(id: string): Promise<void> {
    await this.repository.update(id, {
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
