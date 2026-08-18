import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationChannelType } from '../../common/enums/channel.enum';
import { DigestMode } from '../../common/enums/digest-mode.enum';

/**
 * File d'attente d'agrégation NOTIF-003. Une notification différée pour
 * digest produit une ligne ici plutôt qu'un job BullMQ immédiat ; le flush
 * cron (`DigestFlushService`) revendique atomiquement les lignes d'une
 * fenêtre close (`flushed: false -> true` sous condition) avant de créer LA
 * notification agrégée, garantissant l'idempotence même si deux exécutions
 * du cron se chevauchent.
 */
@Entity('notification_digest_queue')
@Index(['userId', 'channel', 'mode', 'windowStart'])
@Index(['mode', 'flushed', 'windowStart'])
export class DigestQueueEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 191, name: 'user_id' })
  userId!: string;

  @Column({ type: 'enum', enum: NotificationChannelType })
  channel!: NotificationChannelType;

  @Column({ type: 'enum', enum: DigestMode })
  mode!: DigestMode;

  /** Début de la fenêtre d'agrégation (bucket HOURLY/DAILY, aligné UTC). */
  @Column({ type: 'datetime', name: 'window_start' })
  windowStart!: Date;

  @Column({ type: 'varchar', length: 36, name: 'notification_id' })
  notificationId!: string;

  @Column({ type: 'varchar', length: 36, name: 'delivery_id' })
  deliveryId!: string;

  @Column({ type: 'boolean', default: false })
  flushed!: boolean;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
