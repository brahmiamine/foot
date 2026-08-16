import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Seller } from './entities/seller.entity';
import { SellerUser } from './entities/seller-user.entity';
import { SellersService } from './sellers.service';
import { SellersController } from './sellers.controller';
import { InternalSellersController } from './internal-sellers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Seller, SellerUser])],
  controllers: [SellersController, InternalSellersController],
  providers: [SellersService],
  exports: [SellersService],
})
export class SellersModule {}
