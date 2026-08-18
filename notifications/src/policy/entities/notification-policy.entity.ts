import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationChannelType } from '../../common/enums/channel.enum';
import { ChannelPolicyMode } from '../../common/enums/channel-policy-mode.enum';

export type NotificationPolicyScopeType = 'PLATFORM' | 'CLUB';

/**
 * NotificationPolicy organisationnelle (NOTIF-001) : pour une catégorie de
 * notification donnée (ou toutes les catégories quand `category` est NULL,
 * un joker de portée), fixe si chaque canal est MANDATORY/DEFAULT/DISABLED.
 * PLATFORM (`scopeId` NULL) fixe le défaut plateforme ; CLUB (`scopeId` =
 * teamId) permet à un club de surcharger ce défaut pour ses propres
 * notifications. Versionnée (GOV-004) : `version` croît de façon monotone
 * par (scopeType, scopeId, category), l'historique est conservé pour
 * l'audit plutôt qu'écrasé.
 */
@Entity('notification_policies')
@Index(['scopeType', 'scopeId', 'category'])
export class NotificationPolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ['PLATFORM', 'CLUB'], name: 'scope_type' })
  scopeType!: NotificationPolicyScopeType;

  @Column({ type: 'varchar', length: 191, nullable: true, name: 'scope_id' })
  scopeId!: string | null;

  /** NULL = s'applique à toute catégorie sans policy plus spécifique dans cette portée. */
  @Column({ type: 'varchar', length: 128, nullable: true })
  category!: string | null;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'datetime', nullable: true, name: 'effective_from' })
  effectiveFrom!: Date | null;

  @Column({ type: 'datetime', nullable: true, name: 'effective_until' })
  effectiveUntil!: Date | null;

  @Column({ type: 'json' })
  channels!: Partial<Record<NotificationChannelType, ChannelPolicyMode>>;

  @Column({ type: 'varchar', length: 191, name: 'updated_by' })
  updatedBy!: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
