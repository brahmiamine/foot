import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { KonnectController } from './providers/konnect/konnect.controller';
import { KonnectModule } from './providers/konnect/konnect.module';
import { PaymeeController } from './providers/paymee/paymee.controller';
import { PaymeeModule } from './providers/paymee/paymee.module';
import { FlouciController } from './providers/flouci/flouci.controller';
import { FlouciModule } from './providers/flouci/flouci.module';
import { OutboxModule } from '../outbox/outbox.module';
import { PaymentReconciliationService } from './payment-reconciliation.service';
import { PaymentReconciliationHealthController } from './payment-reconciliation-health.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    KonnectModule,
    PaymeeModule,
    FlouciModule,
    OutboxModule,
  ],
  controllers: [
    PaymentController,
    KonnectController,
    PaymeeController,
    FlouciController,
    PaymentReconciliationHealthController,
  ],
  providers: [PaymentService, PaymentReconciliationService],
  exports: [PaymentService],
})
export class PaymentModule {}
