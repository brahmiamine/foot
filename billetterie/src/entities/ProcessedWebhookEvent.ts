import "reflect-metadata";
import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

/**
 * Journal des `eventId` de webhook payment-api déjà traités (TS-14,
 * avancement.md) — payment-api retente la livraison en cas d'échec réseau
 * (voir payment-api/src/webhooks/webhook-dispatch.service.ts), le même
 * eventId peut donc arriver plusieurs fois. `event_id` est la clé primaire :
 * un INSERT en échec pour doublon (contrainte unique) signale un retry déjà
 * traité, sans jamais ré-exécuter `reconcileTicketPayment`.
 */
@Entity({ name: "tk_processed_webhook_events" })
export class ProcessedWebhookEvent {
  @PrimaryColumn({ type: "varchar", length: 191, name: "event_id" })
  eventId!: string;

  @Column({ type: "varchar", length: 36, name: "payment_id" })
  paymentId!: string;

  @CreateDateColumn({ type: "datetime", name: "processed_at" })
  processedAt!: Date;
}
