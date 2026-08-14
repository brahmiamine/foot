import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { PushPlatform } from '../../common/enums/platform.enum';

/**
 * Appareil enregistré pour le push (§16). Un utilisateur peut avoir
 * plusieurs appareils (unique par `deviceId`). `endpoint`/`p256dh`/`auth`
 * servent au Web Push standard ; `token` sert à Firebase Cloud Messaging
 * (iOS/Android/Web via FCM). Un seul des deux jeux de champs est renseigné
 * selon `platform`.
 */
@Entity('push_subscriptions')
@Unique(['userId', 'deviceId'])
@Index(['userId'])
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 191, name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 191, name: 'device_id' })
  deviceId!: string;

  @Column({ type: 'enum', enum: PushPlatform })
  platform!: PushPlatform;

  /** Jeton FCM (Android/iOS/Web via Firebase). */
  @Column({ type: 'text', nullable: true })
  token!: string | null;

  /** Endpoint Web Push standard (navigateur). */
  @Column({ type: 'text', nullable: true })
  endpoint!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  p256dh!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  auth!: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'datetime', name: 'last_used_at' })
  lastUsedAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
