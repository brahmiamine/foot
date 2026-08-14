import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { InternalNotificationsController } from './internal-notifications.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [InternalNotificationsController],
})
export class InternalModule {}
