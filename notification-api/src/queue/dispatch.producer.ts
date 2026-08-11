import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationChannelType } from '../common/enums/channel.enum';
import { ChannelDispatchJobData, QUEUE_NAMES } from './queue.constants';

/**
 * Point d'entrée unique pour mettre un canal en file (§17). Les notifications
 * programmées (§23) utilisent le `delay` natif de BullMQ plutôt qu'un
 * poller cron : le job ne sera traité par le worker qu'à `scheduledAt`.
 */
@Injectable()
export class QueueDispatchProducer {
  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL)
    private readonly emailQueue: Queue<ChannelDispatchJobData>,
    @InjectQueue(QUEUE_NAMES.PUSH)
    private readonly pushQueue: Queue<ChannelDispatchJobData>,
    @InjectQueue(QUEUE_NAMES.SMS)
    private readonly smsQueue: Queue<ChannelDispatchJobData>,
  ) {}

  async enqueue(
    channel: NotificationChannelType,
    notificationId: string,
    deliveryId: string,
    delayMs = 0,
  ): Promise<void> {
    const data: ChannelDispatchJobData = { notificationId, deliveryId };
    const opts = delayMs > 0 ? { delay: delayMs } : {};

    switch (channel) {
      case NotificationChannelType.EMAIL:
        await this.emailQueue.add('dispatch', data, opts);
        return;
      case NotificationChannelType.PUSH:
        await this.pushQueue.add('dispatch', data, opts);
        return;
      case NotificationChannelType.SMS:
        await this.smsQueue.add('dispatch', data, opts);
        return;
      default:
        throw new Error(
          `Channel ${String(channel)} cannot be enqueued (handled synchronously)`,
        );
    }
  }
}
