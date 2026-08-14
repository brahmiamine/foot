import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), NotificationsModule],
  controllers: [ModerationController],
  providers: [ModerationService],
})
export class ModerationModule {}
