import { Global, Module } from '@nestjs/common';
import { ServiceAuthGuard } from './guards/service-auth.guard';

@Global()
@Module({
  providers: [ServiceAuthGuard],
  exports: [ServiceAuthGuard],
})
export class AuthModule {}
