import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { Notification } from '../notifications/entities/notification.entity';
import { TemplatesModule } from '../templates/templates.module';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';
import { AdminTemplatesController } from './admin-templates.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    DeliveriesModule,
    TemplatesModule,
  ],
  controllers: [AdminStatsController, AdminTemplatesController],
  providers: [AdminStatsService],
})
export class AdminModule {}
