import { Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import {
  CHANNEL_REGISTRY,
  NotificationChannel,
} from '../../channels/channel.interface';
import { NotificationChannelType } from '../../common/enums/channel.enum';
import { DeliveriesService } from '../../deliveries/deliveries.service';
import { Notification } from '../../notifications/entities/notification.entity';
import { ChannelDispatchJobData } from '../queue.constants';
import { RecipientContextService } from '../recipient-context.service';

/**
 * Logique commune aux workers EMAIL/PUSH/SMS (§17) : charge la notification,
 * assemble le contexte destinataire, délègue au NotificationChannel
 * correspondant, met à jour NotificationDelivery (§25). En cas d'échec, la
 * delivery passe FAILED et l'erreur est relancée pour laisser BullMQ
 * déclencher le retry avec backoff (§18) ; le dernier échec laisse
 * simplement le statut FAILED.
 */
export abstract class BaseChannelProcessor extends WorkerHost {
  protected abstract readonly channelType: NotificationChannelType;
  protected abstract readonly logger: Logger;

  constructor(
    @InjectRepository(Notification)
    protected readonly notifications: Repository<Notification>,
    protected readonly deliveries: DeliveriesService,
    protected readonly recipientContext: RecipientContextService,
    @Inject(CHANNEL_REGISTRY)
    protected readonly channels: Map<string, NotificationChannel>,
  ) {
    super();
  }

  async process(job: Job<ChannelDispatchJobData>): Promise<void> {
    const notification = await this.notifications.findOne({
      where: { id: job.data.notificationId },
    });
    if (!notification) {
      this.logger.warn(
        `Notification ${job.data.notificationId} no longer exists, skipping.`,
      );
      return;
    }

    await this.deliveries.markAttempt(job.data.deliveryId, null);

    const channel = this.channels.get(this.channelType);
    if (!channel) {
      await this.deliveries.markFailed(
        job.data.deliveryId,
        `No channel registered for ${this.channelType}`,
      );
      return;
    }

    try {
      const context = await this.recipientContext.resolve(notification);
      const result = await channel.deliver(context);
      await this.deliveries.markSent(job.data.deliveryId, {
        providerMessageId: result?.providerMessageId,
        providerStatus: result?.providerStatus,
      });
      if (!channel.deliveryConfirmationRequired) {
        await this.deliveries.markDelivered(job.data.deliveryId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.deliveries.markFailed(job.data.deliveryId, message);
      throw error;
    }
  }
}
