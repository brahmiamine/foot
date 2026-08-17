import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { MarketplaceClubSettings } from './entities/marketplace-club-settings.entity';
import { SellerApplication } from './entities/seller-application.entity';
import { SellerInvite } from './entities/seller-invite.entity';
import { Seller } from './entities/seller.entity';
import { SellerUser } from './entities/seller-user.entity';
import { InternalSellersController } from './internal-sellers.controller';
import { MarketplaceSettingsController } from './marketplace-settings.controller';
import { SellerApplicationsController } from './seller-applications.controller';
import { SellersController } from './sellers.controller';
import { SellersService } from './sellers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Seller,
      SellerUser,
      SellerApplication,
      SellerInvite,
      MarketplaceClubSettings,
    ]),
    NotificationsModule,
  ],
  controllers: [
    SellersController,
    InternalSellersController,
    SellerApplicationsController,
    MarketplaceSettingsController,
  ],
  providers: [SellersService],
  exports: [SellersService],
})
export class SellersModule {}
