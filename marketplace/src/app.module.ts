import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { CorrelationIdMiddleware } from './common/correlation/correlation-id.middleware';
import { databaseConfig } from './config/database.config';
import { validateEnv } from './config/env.validation';
import { serviceClientsConfig } from './config/service-clients.config';
import { AuthModule } from './auth/auth.module';
import { SellersModule } from './sellers/sellers.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { VariantsModule } from './variants/variants.module';
import { InventoryModule } from './inventory/inventory.module';
import { CartModule } from './cart/cart.module';
import { CheckoutModule } from './checkout/checkout.module';
import { OrdersModule } from './orders/orders.module';
import { SellerOrdersModule } from './seller-orders/seller-orders.module';
import { ReturnsModule } from './returns/returns.module';
import { PayoutsModule } from './payouts/payouts.module';
import { ModerationModule } from './moderation/moderation.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [databaseConfig, serviceClientsConfig],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => databaseConfig(),
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => [{ ttl: 60_000, limit: 120 }],
    }),
    AuthModule,
    SellersModule,
    CategoriesModule,
    ProductsModule,
    VariantsModule,
    InventoryModule,
    CartModule,
    CheckoutModule,
    OrdersModule,
    SellerOrdersModule,
    ReturnsModule,
    PayoutsModule,
    ModerationModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
