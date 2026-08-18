import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationPolicyAudit } from '../policy/entities/notification-policy-audit.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { TemplatesService } from './templates.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationTemplate, NotificationPolicyAudit]),
  ],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
