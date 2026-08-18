import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../payment/entities/payment.entity';
import { FlouciModule } from '../payment/providers/flouci/flouci.module';
import { OutboxModule } from '../outbox/outbox.module';
import { RefundApprovalPolicyController } from './refund-approval-policy.controller';
import { RefundApprovalPolicyService } from './refund-approval-policy.service';
import { Refund } from './entities/refund.entity';
import { RefundApprovalPolicy } from './entities/refund-approval-policy.entity';
import { RefundStatusHistory } from './entities/refund-status-history.entity';
import { RefundService } from './refund.service';
import { PaymentRefundController } from './payment-refund.controller';
import { RefundController } from './refund.controller';
import { RefundOperatorGuard } from './guards/refund-operator.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Refund,
      RefundApprovalPolicy,
      RefundStatusHistory,
    ]),
    FlouciModule,
    OutboxModule,
  ],
  controllers: [
    PaymentRefundController,
    RefundController,
    RefundApprovalPolicyController,
  ],
  providers: [RefundService, RefundApprovalPolicyService, RefundOperatorGuard],
  exports: [RefundService, RefundApprovalPolicyService],
})
export class RefundModule {}
