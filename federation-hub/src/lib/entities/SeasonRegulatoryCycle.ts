import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { SeasonRegulatoryCycleStatus } from '../../../../packages/regulatory-shared/src/seasonRegulatoryCycle'

const STATUSES = ['DRAFT', 'ACTIVE', 'CLOSED'] as const

@Entity({ name: 'season_regulatory_cycles' })
export class SeasonRegulatoryCycle {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'season_id' }) seasonId!: string
  @Column({ type: 'char', length: 36, name: 'federation_id' }) federationId!: string
  @Column({ type: 'char', length: 36, nullable: true, name: 'league_id' }) leagueId?: string | null
  @Column({ type: 'enum', enum: STATUSES, default: 'DRAFT' }) status!: SeasonRegulatoryCycleStatus
  @Column({ type: 'datetime', nullable: true, name: 'club_licensing_open_at' }) clubLicensingOpenAt?: Date | null
  @Column({ type: 'datetime', nullable: true, name: 'club_licensing_close_at' }) clubLicensingCloseAt?: Date | null
  @Column({ type: 'datetime', nullable: true, name: 'registration_open_at' }) registrationOpenAt?: Date | null
  @Column({ type: 'datetime', nullable: true, name: 'registration_close_at' }) registrationCloseAt?: Date | null
  @Column({ type: 'char', length: 36, nullable: true, name: 'previous_season_id' }) previousSeasonId?: string | null
  @Column({ type: 'datetime', nullable: true, name: 'previous_season_expired_at' }) previousSeasonExpiredAt?: Date | null
  @Column({ type: 'varchar', length: 191, name: 'created_by' }) createdBy!: string
  @CreateDateColumn({ type: 'datetime', name: 'created_at' }) createdAt!: Date
  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' }) updatedAt!: Date
}

@Entity({ name: 'season_regulatory_cycle_history' })
export class SeasonRegulatoryCycleHistory {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'cycle_id' }) cycleId!: string
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
