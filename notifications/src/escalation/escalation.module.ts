import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationPolicyAudit } from '../policy/entities/notification-policy-audit.entity';
import { NotificationEscalation } from './entities/notification-escalation.entity';
import { NotificationEscalationPolicy } from './entities/notification-escalation-policy.entity';
import { EscalationPolicyService } from './escalation-policy.service';
import { EscalationSweepService } from './escalation-sweep.service';
import { EscalationService } from './escalation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationEscalation,
      NotificationEscalationPolicy,
      NotificationPolicyAudit,
    ]),
    NotificationsModule,
  ],
  providers: [
    EscalationPolicyService,
    EscalationService,
    EscalationSweepService,
  ],
  exports: [EscalationPolicyService],
})
export class EscalationModule {}
