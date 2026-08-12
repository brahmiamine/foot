import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { webhookUrlsConfig } from './webhook-urls.config';
import { WebhookDispatchService } from './webhook-dispatch.service';

// Exporte WebhookDispatchService pour OutboxWorkerService (../outbox) —
// seul consommateur restant depuis la suppression de PaymentWebhookListener
// (TS-12, remplacé par l'outbox transactionnel).
@Module({
  imports: [ConfigModule.forFeature(webhookUrlsConfig), HttpModule],
  providers: [WebhookDispatchService],
  exports: [WebhookDispatchService],
})
export class WebhooksModule {}
