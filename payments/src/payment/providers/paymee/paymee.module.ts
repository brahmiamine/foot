import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { paymeeConfig } from './paymee.config';
import { PaymeeClient } from './paymee.client';
import { PaymeeProvider } from './paymee.provider';

/**
 * Fully isolated Paymee integration. Nothing outside this module talks to
 * Paymee directly — other modules only ever depend on PaymeeProvider.
 */
@Module({
  imports: [ConfigModule.forFeature(paymeeConfig), HttpModule],
  providers: [PaymeeClient, PaymeeProvider],
  exports: [PaymeeProvider],
})
export class PaymeeModule {}
