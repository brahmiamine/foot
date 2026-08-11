import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationChannelType } from '../../common/enums/channel.enum';
import { DeliveryStatus } from '../../common/enums/delivery-status.enum';

/**
 * Historique/audit d'envoi par canal (§25) : une notification produit une
 * ligne de delivery par canal résolu (IN_APP/EMAIL/PUSH/SMS), mise à jour à
 * chaque tentative. Permet de répondre à "Notification créée -> Email envoyé
 * -> Provider accepté -> Delivered" ou "Email -> FAILED -> Retry -> SUCCESS".
 */
@Entity('notification_deliveries')
@Index(['notificationId'])
@Index(['status'])
export class NotificationDelivery {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36, name: 'notification_id' })
  notificationId!: string;

  @Column({ type: 'enum', enum: NotificationChannelType })
  channel!: NotificationChannelType;

  @Column({ type: 'varchar', length: 64, nullable: true })
  provider!: string | null;

  /** Référence externe de l'envoi (ex: `message_id` TunisieSMS) — conservée pour l'audit et une future réconciliation DLR (§25). */
  @Column({
    type: 'varchar',
    length: 191,
    nullable: true,
    name: 'provider_message_id',
  })
  providerMessageId!: string | null;

  /** Statut brut renvoyé par le provider (ex: "200 ok" TunisieSMS), distinct du statut interne ci-dessous. */
  @Column({
    type: 'varchar',
    length: 191,
    nullable: true,
    name: 'provider_status',
  })
  providerStatus!: string | null;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  status!: DeliveryStatus;

  @Column({ type: 'int', default: 0 })
  attempt!: number;

  @Column({ type: 'datetime', nullable: true, name: 'sent_at' })
  sentAt!: Date | null;

  @Column({ type: 'datetime', nullable: true, name: 'delivered_at' })
  deliveredAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
