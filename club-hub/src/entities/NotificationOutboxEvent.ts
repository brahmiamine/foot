import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { NotifyPayload } from "@/lib/notificationClient";

export type NotificationOutboxStatus = "PENDING" | "PROCESSED" | "FAILED";

/**
 * TS-25/TS-26 (avancement.md, Epic E07) : remplace l'appel `notify(...)`
 * best-effort (séquentiel après le commit métier, perdu si le process
 * crashe entre les deux ou si notifications est injoignable) par un
 * outbox transactionnel — même principe que `payment_outbox_events`
 * (payments, TS-12/TS-13). `NotificationOutboxService.enqueue()` insère
 * la ligne dans LA MÊME transaction DB que l'écriture métier (voir
 * app/admin/news/actions.ts) : soit les deux committent ensemble, soit
 * aucun des deux.
 */
@Entity("notification_outbox_events")
export class NotificationOutboxEvent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 191, name: "event_id" })
  eventId!: string;

  @Column({ type: "json" })
  payload!: NotifyPayload;

  @Index()
  @Column({ type: "enum", enum: ["PENDING", "PROCESSED", "FAILED"], default: "PENDING" })
  status!: NotificationOutboxStatus;

  @Column({ type: "int", default: 0 })
  attempts!: number;

  // NULL = prêt à traiter dès le prochain passage. Fixé après un échec,
  // voir retry-schedule.ts (même calendrier que payments : 1min -> 5min
  // -> 15min -> 1h -> 6h -> FAILED).
  @Column({ type: "datetime", nullable: true, name: "next_retry_at" })
  nextRetryAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @Column({ type: "datetime", nullable: true, name: "processed_at" })
  processedAt!: Date | null;

  @Column({ type: "varchar", length: 500, nullable: true, name: "last_error" })
  lastError!: string | null;
}
