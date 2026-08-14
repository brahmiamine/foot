import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../payment/entities/payment.entity';
import { FlouciModule } from '../payment/providers/flouci/flouci.module';
import { OutboxModule } from '../outbox/outbox.module';
import { Refund } from './entities/refund.entity';
import { RefundStatusHistory } from './entities/refund-status-history.entity';
import { RefundService } from './refund.service';
import { PaymentRefundController } from './payment-refund.controller';
import { RefundController } from './refund.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Refund, RefundStatusHistory]),
    FlouciModule,
    OutboxModule,
  ],
  controllers: [PaymentRefundController, RefundController],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}
