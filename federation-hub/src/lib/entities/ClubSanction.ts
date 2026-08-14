import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { ClubSanctionSourceType, ClubSanctionStatus, ClubSanctionType } from '../../../../packages/regulatory-shared/src/clubSanction'

const TYPES = ['TRANSFER_BAN', 'REGISTRATION_BAN', 'COMPETITION_BAN', 'FINE', 'POINT_DEDUCTION', 'MATCH_BEHIND_CLOSED_DOORS', 'STADIUM_SUSPENSION', 'COMPETITION_EXCLUSION', 'WARNING'] as const
const STATUSES = ['ACTIVE', 'SUSPENDED', 'LIFTED', 'EXPIRED', 'CANCELLED'] as const
const SOURCE_TYPES = ['LEGAL_CASE', 'DISCIPLINARY_CASE', 'MANUAL'] as const

@Entity({ name: 'club_sanctions' })
export class ClubSanction {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'club_id' }) clubId!: string
  @Column({ type: 'char', length: 36, nullable: true, name: 'season_id' }) seasonId?: string | null
  @Column({ type: 'char', length: 36, name: 'federation_id' }) federationId!: string
  @Column({ type: 'char', length: 36, nullable: true, name: 'league_id' }) leagueId?: string | null
  @Column({ type: 'enum', enum: SOURCE_TYPES, default: 'MANUAL', name: 'source_case_type' }) sourceCaseType!: ClubSanctionSourceType
  @Column({ type: 'char', length: 36, nullable: true, name: 'source_case_id' }) sourceCaseId?: string | null
  @Column({ type: 'enum', enum: TYPES }) type!: ClubSanctionType
  @Column({ type: 'text' }) reason!: string
  @Column({ type: 'datetime', name: 'starts_at' }) startsAt!: Date
  @Column({ type: 'datetime', nullable: true, name: 'ends_at' }) endsAt?: Date | null
  @Column({ type: 'decimal', precision: 15, scale: 3, nullable: true, name: 'amount_due' }) amountDue?: string | null
  @Column({ type: 'char', length: 3, nullable: true }) currency?: string | null
  @Column({ type: 'enum', enum: STATUSES, default: 'ACTIVE' }) status!: ClubSanctionStatus
  @Column({ type: 'datetime', nullable: true, name: 'lifted_at' }) liftedAt?: Date | null
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'lifted_by' }) liftedBy?: string | null
  @Column({ type: 'text', nullable: true, name: 'lift_reason' }) liftReason?: string | null
  @Column({ type: 'varchar', length: 191, name: 'created_by' }) createdBy!: string
  @CreateDateColumn({ type: 'datetime', name: 'created_at' }) createdAt!: Date
  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' }) updatedAt!: Date
}

@Entity({ name: 'club_sanction_history' })
export class ClubSanctionHistory {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'sanction_id' }) sanctionId!: string
  @Column({ type: 'varchar', length: 100 }) action!: string
  @Column({ type: 'varchar', length: 32, nullable: true, name: 'from_status' }) fromStatus?: string | null
  @Column({ type: 'varchar', length: 32, nullable: true, name: 'to_status' }) toStatus?: string | null
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'actor_user_id' }) actorUserId?: string | null
  @Column({ type: 'varchar', length: 50, name: 'actor_role' }) actorRole!: string
  @Column({ type: 'text', nullable: true }) reason?: string | null
  @Column({ type: 'json', nullable: true, name: 'before_value' }) beforeValue?: Record<string, unknown> | null
  @Column({ type: 'json', nullable: true, name: 'after_value' }) afterValue?: Record<string, unknown> | null
  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' }) ipAddress?: string | null
  @Column({ type: 'varchar', length: 512, nullable: true, name: 'user_agent' }) userAgent?: string | null
  @CreateDateColumn({ type: 'datetime', name: 'created_at' }) createdAt!: Date
}
