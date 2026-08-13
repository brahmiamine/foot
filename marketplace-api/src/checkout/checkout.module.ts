import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketOrder } from '../orders/entities/market-order.entity';
import { SellerOrder } from '../seller-orders/entities/seller-order.entity';
import { SellerOrderItem } from '../seller-orders/entities/seller-order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../variants/entities/product-variant.entity';
import { Seller } from '../sellers/entities/seller.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { CartModule } from '../cart/cart.module';
import { InventoryModule } from '../inventory/inventory.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { PaymentApiClientService } from './payment-api-client.service';
import { NotificationApiClientService } from './notification-api-client.service';
import { CheckoutReconciliationService } from './checkout-reconciliation.service';
import { CheckoutReconciliationHealthController } from './checkout-reconciliation-health.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MarketOrder,
      SellerOrder,
      SellerOrderItem,
      Product,
      ProductVariant,
      Seller,
      InventoryItem,
    ]),
    CartModule,
    InventoryModule,
    NotificationsModule,
  ],
  controllers: [CheckoutController, CheckoutReconciliationHealthController],
  providers: [
    CheckoutService,
    PaymentApiClientService,
    NotificationApiClientService,
    CheckoutReconciliationService,
  ],
  // PaymentApiClientService/NotificationApiClientService exportés pour
  // ReturnsModule (TASK-P0-006) — clients sans état ni dépendance propre
  // (env + fetch), réutilisés tels quels plutôt que dupliqués.
  exports: [
    CheckoutService,
    PaymentApiClientService,
    NotificationApiClientService,
  ],
})
export class CheckoutModule {}
