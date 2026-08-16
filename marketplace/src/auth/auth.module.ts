import { Global, Module } from '@nestjs/common';
import { SellersModule } from '../sellers/sellers.module';
import { AuthController } from './auth.controller';
import { SellerJwtService } from './seller-jwt.service';
import { ServiceAuthGuard } from './guards/service-auth.guard';
import { SellerJwtGuard } from './guards/seller-jwt.guard';
import { AllowedApplicationsGuard } from './guards/allowed-applications.guard';

@Global()
@Module({
  imports: [SellersModule],
  controllers: [AuthController],
  providers: [
    SellerJwtService,
    ServiceAuthGuard,
    SellerJwtGuard,
    AllowedApplicationsGuard,
  ],
  exports: [
    SellerJwtService,
    ServiceAuthGuard,
    SellerJwtGuard,
    AllowedApplicationsGuard,
  ],
})
export class AuthModule {}
