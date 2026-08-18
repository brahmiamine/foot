import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { EscalationModule } from '../escalation/escalation.module';
import { Notification } from '../notifications/entities/notification.entity';
import { PolicyModule } from '../policy/policy.module';
import { TemplatesModule } from '../templates/templates.module';
import { AdminEscalationPoliciesController } from './admin-escalation-policies.controller';
import { AdminNotificationPoliciesController } from './admin-notification-policies.controller';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';
import { AdminTemplatesController } from './admin-templates.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    DeliveriesModule,
    TemplatesModule,
    PolicyModule,
    EscalationModule,
  ],
  controllers: [
    AdminStatsController,
    AdminTemplatesController,
    AdminNotificationPoliciesController,
    AdminEscalationPoliciesController,
  ],
  providers: [AdminStatsService],
})
export class AdminModule {}
