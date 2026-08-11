import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Trace un événement externe reçu sur /internal/notifications (§19). La
 * contrainte unique (application, event_id) garantit qu'un même événement
 * (ex: `payment-123-succeeded` envoyé deux fois par un webhook retryé) ne
 * génère jamais deux fois les notifications associées : IdempotencyService
 * retourne le résultat déjà produit au lieu de recréer.
 */
@Entity('notification_events')
@Unique(['application', 'eventId'])
export class NotificationEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  @Index()
  application!: string;

  @Column({ type: 'varchar', length: 191, name: 'event_id' })
  eventId!: string;

  @Column({ type: 'varchar', length: 128 })
  type!: string;

  /** IDs des notifications (une par destinataire résolu) créées par cet événement. */
  @Column({ type: 'json', name: 'notification_ids' })
  notificationIds!: string[];

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
