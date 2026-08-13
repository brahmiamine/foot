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
  exports: [CheckoutService],
})
export class CheckoutModule {}
