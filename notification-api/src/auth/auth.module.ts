import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ServiceAuthGuard } from './guards/service-auth.guard';
import { SsoJwtService } from './sso-jwt.service';

@Global()
@Module({
  providers: [SsoJwtService, JwtAuthGuard, RolesGuard, ServiceAuthGuard],
  exports: [SsoJwtService, JwtAuthGuard, RolesGuard, ServiceAuthGuard],
})
export class AuthModule {}
