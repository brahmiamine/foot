import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { flouciConfig } from './flouci.config';
import { FlouciClient } from './flouci.client';
import { FlouciProvider } from './flouci.provider';

/**
 * Fully isolated Flouci integration. Nothing outside this module talks to
 * Flouci directly — other modules only ever depend on FlouciProvider.
 */
@Module({
  imports: [ConfigModule.forFeature(flouciConfig), HttpModule],
  providers: [FlouciClient, FlouciProvider],
  exports: [FlouciProvider],
})
export class FlouciModule {}
