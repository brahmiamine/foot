import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEvent } from './entities/notification-event.entity';
import { IdempotencyService } from './idempotency.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEvent])],
  providers: [IdempotencyService],
  exports: [IdempotencyService],
})
export class EventsModule {}
