import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProductImage } from './entities/product-image.entity';
import { Product } from './entities/product.entity';
import { InternalProductsController } from './internal-products.controller';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage]),
    NotificationsModule,
  ],
  controllers: [ProductsController, InternalProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
