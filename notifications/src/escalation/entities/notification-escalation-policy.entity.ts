import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { NotificationPolicyScopeType } from '../../policy/entities/notification-policy.entity';

/**
 * Policy d'escalade NOTIF-004 : pour une catégorie (ou toute catégorie sans
 * policy plus spécifique, `category` NULL), fixe si une notification
 * critique (priority HIGH/URGENT) non lue doit être escaladée après
 * `delayMinutes` vers un destinataire de secours (`backupUserId` explicite,
 * ou `backupRole` résolu dans le club de la notification). Même modèle de
 * portée/versionnement que NotificationPolicy (NOTIF-001).
 */
@Entity('notification_escalation_policies')
@Index(['scopeType', 'scopeId', 'category'])
export class NotificationEscalationPolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ['PLATFORM', 'CLUB'], name: 'scope_type' })
  scopeType!: NotificationPolicyScopeType;

  @Column({ type: 'varchar', length: 191, nullable: true, name: 'scope_id' })
  scopeId!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  category!: string | null;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'datetime', nullable: true, name: 'effective_from' })
  effectiveFrom!: Date | null;

  @Column({ type: 'datetime', nullable: true, name: 'effective_until' })
  effectiveUntil!: Date | null;

  @Column({ type: 'boolean' })
  enabled!: boolean;

  @Column({ type: 'int', name: 'delay_minutes' })
  delayMinutes!: number;

  @Column({
    type: 'varchar',
    length: 191,
    nullable: true,
    name: 'backup_user_id',
  })
  backupUserId!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'backup_role' })
  backupRole!: string | null;

  @Column({ type: 'varchar', length: 191, name: 'updated_by' })
  updatedBy!: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
