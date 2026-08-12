import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnRequest } from './entities/return-request.entity';
import { SellerOrder } from '../seller-orders/entities/seller-order.entity';
import { SellerOrderItem } from '../seller-orders/entities/seller-order-item.entity';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { InternalReturnsController } from './internal-returns.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReturnRequest, SellerOrder, SellerOrderItem]),
  ],
  controllers: [ReturnsController, InternalReturnsController],
  providers: [ReturnsService],
})
export class ReturnsModule {}
