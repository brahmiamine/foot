import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationChannelType } from '../../common/enums/channel.enum';

/**
 * Préférence utilisateur par canal ET par catégorie (§11). `category`
 * correspond à `Notification.category` (par défaut le `type`, mais peut
 * regrouper plusieurs types — ex: PAYMENT). Absence de ligne = valeur par
 * défaut (voir PreferencesService.DEFAULT_ENABLED) ; les types obligatoires
 * (§12) ignorent complètement cette table.
 */
@Entity('notification_preferences')
@Unique(['userId', 'category', 'channel'])
@Index(['userId'])
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 191, name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 128 })
  category!: string;

  @Column({ type: 'enum', enum: NotificationChannelType })
  channel!: NotificationChannelType;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
