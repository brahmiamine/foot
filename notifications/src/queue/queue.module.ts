import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandingModule } from '../branding/branding.module';
import { ChannelsModule } from '../channels/channels.module';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { Notification } from '../notifications/entities/notification.entity';
import { PreferencesModule } from '../preferences/preferences.module';
import { QueueDispatchProducer } from './dispatch.producer';
import { EmailProcessor } from './processors/email.processor';
import { PushProcessor } from './processors/push.processor';
import { SmsProcessor } from './processors/sms.processor';
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from './queue.constants';
import { RecipientContextService } from './recipient-context.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') ?? 'localhost',
          port: config.get<number>('REDIS_PORT') ?? 6379,
          password: config.get<string>('REDIS_PASSWORD'),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.EMAIL, defaultJobOptions: DEFAULT_JOB_OPTIONS },
      { name: QUEUE_NAMES.PUSH, defaultJobOptions: DEFAULT_JOB_OPTIONS },
      { name: QUEUE_NAMES.SMS, defaultJobOptions: DEFAULT_JOB_OPTIONS },
    ),
    TypeOrmModule.forFeature([Notification]),
    ChannelsModule,
    DeliveriesModule,
    PreferencesModule,
    BrandingModule,
  ],
  providers: [
    QueueDispatchProducer,
    RecipientContextService,
    EmailProcessor,
    PushProcessor,
    SmsProcessor,
  ],
  exports: [QueueDispatchProducer, BullModule],
})
export class QueueModule {}
