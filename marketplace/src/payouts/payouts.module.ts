import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckoutModule } from '../checkout/checkout.module';
import { SellerOrder } from '../seller-orders/entities/seller-order.entity';
import { Payout } from './entities/payout.entity';
import { InternalPayoutsController } from './internal-payouts.controller';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payout, SellerOrder]), CheckoutModule],
  controllers: [PayoutsController, InternalPayoutsController],
  providers: [PayoutsService],
})
export class PayoutsModule {}
