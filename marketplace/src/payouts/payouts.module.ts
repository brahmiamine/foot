import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payout } from './entities/payout.entity';
import { SellerOrder } from '../seller-orders/entities/seller-order.entity';
import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';
import { InternalPayoutsController } from './internal-payouts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Payout, SellerOrder])],
  controllers: [PayoutsController, InternalPayoutsController],
  providers: [PayoutsService],
})
export class PayoutsModule {}
