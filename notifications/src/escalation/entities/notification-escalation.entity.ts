import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Trace d'escalade (NOTIF-004), une ligne par notification critique
 * escaladée. La contrainte unique sur `notificationId` est le verrou
 * d'idempotence du sweep cron : la ligne est insérée AVANT l'envoi au
 * destinataire de secours, exactement comme `NotificationEvent` protège
 * `IdempotencyService.withIdempotency` (voir EscalationService).
 */
@Entity('notification_escalations')
@Index(['notificationId'], { unique: true })
export class NotificationEscalation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36, name: 'notification_id' })
  notificationId!: string;

  @Column({
    type: 'varchar',
    length: 191,
    nullable: true,
    name: 'backup_user_id',
  })
  backupUserId!: string | null;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    name: 'escalated_notification_id',
  })
  escalatedNotificationId!: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'escalated_at' })
  escalatedAt!: Date;
}
