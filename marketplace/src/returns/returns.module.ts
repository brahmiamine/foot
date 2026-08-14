import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnRequest } from './entities/return-request.entity';
import { SellerOrder } from '../seller-orders/entities/seller-order.entity';
import { SellerOrderItem } from '../seller-orders/entities/seller-order-item.entity';
import { MarketOrder } from '../orders/entities/market-order.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { CheckoutModule } from '../checkout/checkout.module';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { InternalReturnsController } from './internal-returns.controller';
import { ReturnRefundReconciliationService } from './return-refund-reconciliation.service';
import { ReturnRefundReconciliationHealthController } from './return-refund-reconciliation-health.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReturnRequest,
      SellerOrder,
      SellerOrderItem,
      MarketOrder,
    ]),
    NotificationsModule,
    // Réutilise PaymentApiClientService/NotificationApiClientService
    // exportés par CheckoutModule (TASK-P0-006) plutôt que de les dupliquer.
    CheckoutModule,
  ],
  controllers: [
    ReturnsController,
    InternalReturnsController,
    ReturnRefundReconciliationHealthController,
  ],
  providers: [ReturnsService, ReturnRefundReconciliationService],
})
export class ReturnsModule {}
