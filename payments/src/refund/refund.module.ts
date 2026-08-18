import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { OutboxModule } from '../outbox/outbox.module';
import { Payment } from '../payment/entities/payment.entity';
import { FlouciModule } from '../payment/providers/flouci/flouci.module';
import { RefundApprovalPolicyController } from './refund-approval-policy.controller';
import { RefundApprovalPolicyService } from './refund-approval-policy.service';
import { RefundManualReviewController } from './refund-manual-review.controller';
import { RefundManualReviewPolicyService } from './refund-manual-review-policy.service';
import { RefundManualReviewSlaService } from './refund-manual-review-sla.service';
import { RefundManualReviewSlaWorkerService } from './refund-manual-review-sla-worker.service';
import { RefundApprovalPolicy } from './entities/refund-approval-policy.entity';
import { RefundManualReviewPolicy } from './entities/refund-manual-review-policy.entity';
import { RefundStatusHistory } from './entities/refund-status-history.entity';
import { Refund } from './entities/refund.entity';
import { RefundOperatorGuard } from './guards/refund-operator.guard';
import { PaymentRefundController } from './payment-refund.controller';
import { RefundController } from './refund.controller';
import { RefundService } from './refund.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Refund,
      RefundApprovalPolicy,
      RefundManualReviewPolicy,
      RefundStatusHistory,
    ]),
    FlouciModule,
    OutboxModule,
    NotificationsModule,
  ],
  controllers: [
    PaymentRefundController,
    RefundController,
    RefundApprovalPolicyController,
    RefundManualReviewController,
  ],
  providers: [
    RefundService,
    RefundApprovalPolicyService,
    RefundManualReviewPolicyService,
    RefundManualReviewSlaService,
    RefundManualReviewSlaWorkerService,
    RefundOperatorGuard,
  ],
  exports: [
    RefundService,
    RefundApprovalPolicyService,
    RefundManualReviewPolicyService,
    RefundManualReviewSlaService,
  ],
})
export class RefundModule {}
