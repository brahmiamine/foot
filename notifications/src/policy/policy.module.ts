import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationPolicy } from './entities/notification-policy.entity';
import { NotificationPolicyAudit } from './entities/notification-policy-audit.entity';
import { PolicyService } from './policy.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationPolicy, NotificationPolicyAudit]),
  ],
  providers: [PolicyService],
  exports: [PolicyService],
})
export class PolicyModule {}
