import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEvent } from './entities/outbox-event.entity';
import { OutboxService } from './outbox.service';
import { OutboxWorkerService } from './outbox-worker.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OutboxEvent]),
    NotificationsModule,
    WebhooksModule,
  ],
  providers: [OutboxService, OutboxWorkerService],
  exports: [OutboxService],
})
export class OutboxModule {}
