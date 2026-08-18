import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialLedgerModule } from '../ledger/financial-ledger.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { OutboxEvent } from './entities/outbox-event.entity';
import { OutboxHealthController } from './outbox-health.controller';
import { OutboxService } from './outbox.service';
import { OutboxWorkerService } from './outbox-worker.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OutboxEvent]),
    NotificationsModule,
    WebhooksModule,
    FinancialLedgerModule,
  ],
  controllers: [OutboxHealthController],
  providers: [OutboxService, OutboxWorkerService],
  exports: [OutboxService],
})
export class OutboxModule {}
