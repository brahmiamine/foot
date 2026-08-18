import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentRoutingPolicy } from './entities/payment-routing-policy.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentRoutingController } from './payment-routing.controller';
import { paymentRoutingConfig } from './payment-routing.config';
import { PaymentRoutingPolicyService } from './payment-routing-policy.service';
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
    ConfigModule.forFeature(paymentRoutingConfig),
    TypeOrmModule.forFeature([Payment, PaymentRoutingPolicy]),
    KonnectModule,
    PaymeeModule,
    FlouciModule,
    OutboxModule,
  ],
  controllers: [
    PaymentController,
    PaymentRoutingController,
    KonnectController,
    PaymeeController,
    FlouciController,
    PaymentReconciliationHealthController,
  ],
  providers: [
    PaymentService,
    PaymentRoutingPolicyService,
    PaymentReconciliationService,
  ],
  exports: [PaymentService, PaymentRoutingPolicyService],
})
export class PaymentModule {}
