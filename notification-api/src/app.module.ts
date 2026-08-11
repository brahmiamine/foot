import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { BrandingModule } from './branding/branding.module';
import { databaseConfig } from './config/database.config';
import { validateEnv } from './config/env.validation';
import { redisConfig } from './config/redis.config';
import { serviceClientsConfig } from './config/service-clients.config';
import { SharedDirectoryModule } from './database/shared-directory.module';
import { InternalModule } from './internal/internal.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PreferencesModule } from './preferences/preferences.module';
import { PushSubscriptionsModule } from './push-subscriptions/push-subscriptions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [databaseConfig, redisConfig, serviceClientsConfig],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => databaseConfig(),
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => [{ ttl: 60_000, limit: 120 }],
    }),
    ScheduleModule.forRoot(),
    SharedDirectoryModule,
    AuthModule,
    NotificationsModule,
    PreferencesModule,
    PushSubscriptionsModule,
    BrandingModule,
    InternalModule,
    AdminModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
