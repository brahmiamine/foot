import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { Notification } from '../notifications/entities/notification.entity';
import { QueueModule } from '../queue/queue.module';
import { DigestFlushService } from './digest-flush.service';
import { DigestQueueEntry } from './entities/digest-queue-entry.entity';
import { DigestService } from './digest.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DigestQueueEntry, Notification]),
    DeliveriesModule,
    QueueModule,
  ],
  providers: [DigestService, DigestFlushService],
  exports: [DigestService],
})
export class DigestModule {}
