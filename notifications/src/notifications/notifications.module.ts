import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { DigestModule } from '../digest/digest.module';
import { EventsModule } from '../events/events.module';
import { PolicyModule } from '../policy/policy.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { QueueModule } from '../queue/queue.module';
import { Notification } from './entities/notification.entity';
import { NotificationCleanupService } from './notification-cleanup.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { RecipientResolverService } from './recipient-resolver.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    DeliveriesModule,
    PreferencesModule,
    EventsModule,
    QueueModule,
    PolicyModule,
    DigestModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    RecipientResolverService,
    NotificationCleanupService,
  ],
  exports: [NotificationsService, RecipientResolverService],
})
export class NotificationsModule {}
