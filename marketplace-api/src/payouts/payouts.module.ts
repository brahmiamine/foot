import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payout } from './entities/payout.entity';
import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Payout])],
  controllers: [PayoutsController],
  providers: [PayoutsService],
})
export class PayoutsModule {}
