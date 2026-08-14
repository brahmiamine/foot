import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { notificationClientConfig } from './notification-client.config';
import { NotificationClientService } from './notification-client.service';

// Exporte NotificationClientService pour OutboxWorkerService (../outbox) —
// seul consommateur restant depuis la suppression de
// PaymentNotificationsListener (TS-12, remplacé par l'outbox transactionnel).
@Module({
  imports: [ConfigModule.forFeature(notificationClientConfig), HttpModule],
  providers: [NotificationClientService],
  exports: [NotificationClientService],
})
export class NotificationsModule {}
