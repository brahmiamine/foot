import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { notificationClientConfig } from './notification-client.config';
import { NotificationClientService } from './notification-client.service';
import { PaymentNotificationsListener } from './payment-notifications.listener';

@Module({
  imports: [ConfigModule.forFeature(notificationClientConfig), HttpModule],
  providers: [NotificationClientService, PaymentNotificationsListener],
})
export class NotificationsModule {}
