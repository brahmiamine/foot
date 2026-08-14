import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { konnectConfig } from './konnect.config';
import { KonnectClient } from './konnect.client';
import { KonnectProvider } from './konnect.provider';

/**
 * Fully isolated Konnect integration. Nothing outside this module talks to
 * Konnect directly — other modules only ever depend on KonnectProvider.
 */
@Module({
  imports: [ConfigModule.forFeature(konnectConfig), HttpModule],
  providers: [KonnectClient, KonnectProvider],
  exports: [KonnectProvider],
})
export class KonnectModule {}
