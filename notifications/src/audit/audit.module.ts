import { Module } from '@nestjs/common';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { AuditController } from './audit.controller';

@Module({
  imports: [DeliveriesModule],
  controllers: [AuditController],
})
export class AuditModule {}
