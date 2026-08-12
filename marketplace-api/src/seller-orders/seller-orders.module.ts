import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SellerOrder } from './entities/seller-order.entity';
import { SellerOrderItem } from './entities/seller-order-item.entity';
import { SellerOrdersService } from './seller-orders.service';
import { SellerOrdersController } from './seller-orders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SellerOrder, SellerOrderItem])],
  controllers: [SellerOrdersController],
  providers: [SellerOrdersService],
})
export class SellerOrdersModule {}
