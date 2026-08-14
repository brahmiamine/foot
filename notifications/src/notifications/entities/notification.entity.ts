import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationPriority } from '../../common/enums/priority.enum';
import { NotificationChannelType } from '../../common/enums/channel.enum';

/**
 * Enregistrement canonique d'une notification pour UN destinataire (§6).
 * Une notification broadcast (§22) est expansée par RecipientResolverService
 * en une ligne par utilisateur ciblé, toutes rattachées au même
 * `notificationEventId` pour l'audit — jamais une seule ligne "groupe".
 *
 * `application`/`type` identifient la source métier (§7, §8) ; le
 * Notification API n'interprète jamais leur valeur (§32), il s'en sert pour
 * router vers un template et des préférences. `data` reste un blob JSON
 * libre pour ne jamais contraindre les applications sources à modifier ce
 * schéma central (§6).
 */
@Entity('notifications')
@Index(['userId', 'readAt'])
@Index(['userId', 'createdAt'])
@Index(['teamId', 'createdAt'])
@Index(['application', 'type'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 191, name: 'user_id' })
  @Index()
  userId!: string;

  @Column({ type: 'varchar', length: 191, nullable: true, name: 'team_id' })
  @Index()
  teamId!: string | null;

  @Column({ type: 'varchar', length: 64 })
  @Index()
  application!: string;

  @Column({ type: 'varchar', length: 128 })
  @Index()
  type!: string;

  /**
   * Regroupement des préférences (§11). Par défaut égal à `type` — une
   * application peut fournir une catégorie plus large (ex: PAYMENT) sans
   * que le Notification API n'ait besoin de connaître le mapping à l'avance.
   */
  @Column({ type: 'varchar', length: 128, name: 'category' })
  category!: string;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority!: NotificationPriority;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'json', nullable: true })
  data!: Record<string, unknown> | null;

  /** Canaux effectivement résolus pour cette notification (préférences appliquées). */
  @Column({ type: 'json', name: 'channels' })
  channels!: NotificationChannelType[];

  @Column({ type: 'boolean', default: false, name: 'mandatory' })
  mandatory!: boolean;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    name: 'notification_event_id',
  })
  notificationEventId!: string | null;

  @Column({ type: 'datetime', nullable: true, name: 'read_at' })
  @Index()
  readAt!: Date | null;

  @Column({ type: 'datetime', nullable: true, name: 'expires_at' })
  expiresAt!: Date | null;

  @Column({ type: 'datetime', nullable: true, name: 'scheduled_at' })
  scheduledAt!: Date | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
