import { Global, Module } from '@nestjs/common';
import { SellersModule } from '../sellers/sellers.module';
import { AuthController } from './auth.controller';
import { SellerJwtService } from './seller-jwt.service';
import { ServiceAuthGuard } from './guards/service-auth.guard';
import { SellerJwtGuard } from './guards/seller-jwt.guard';

@Global()
@Module({
  imports: [SellersModule],
  controllers: [AuthController],
  providers: [SellerJwtService, ServiceAuthGuard, SellerJwtGuard],
  exports: [SellerJwtService, ServiceAuthGuard, SellerJwtGuard],
})
export class AuthModule {}
