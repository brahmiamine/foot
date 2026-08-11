import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { databaseConfig } from './config/database.config';
import { validateEnv } from './config/env.validation';
import { serviceClientsConfig } from './config/service-clients.config';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [databaseConfig, serviceClientsConfig],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => databaseConfig(),
    }),
    // Limite globale par IP (défense en profondeur, notamment sur les
    // webhooks providers qui ne portent pas de clé de service).
    ThrottlerModule.forRootAsync({
      useFactory: () => [{ ttl: 60_000, limit: 120 }],
    }),
    EventEmitterModule.forRoot(),
    AuthModule,
    PaymentModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
