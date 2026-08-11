import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationTemplate } from './entities/notification-template.entity';
import { TemplatesService } from './templates.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationTemplate])],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
