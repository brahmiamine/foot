import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { webhookUrlsConfig } from './webhook-urls.config';
import { WebhookDispatchService } from './webhook-dispatch.service';
import { PaymentWebhookListener } from './payment-webhook.listener';

@Module({
  imports: [ConfigModule.forFeature(webhookUrlsConfig), HttpModule],
  providers: [WebhookDispatchService, PaymentWebhookListener],
})
export class WebhooksModule {}
