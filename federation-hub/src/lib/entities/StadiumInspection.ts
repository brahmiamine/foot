import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { StadiumAspectStatus, StadiumInspectionStatus } from '../../../../packages/regulatory-shared/src/stadiumLicensing'

const ASPECT_STATUSES = ['OK', 'ISSUES', 'CRITICAL', 'NOT_APPLICABLE'] as const
const STATUSES = ['PENDING', 'APPROVED', 'APPROVED_WITH_RESTRICTIONS', 'REJECTED', 'SUSPENDED', 'EXPIRED'] as const

@Entity({ name: 'stadium_inspections' })
export class StadiumInspection {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'bigint', name: 'stadium_id' }) stadiumId!: string
  @Column({ type: 'char', length: 36, name: 'club_id' }) clubId!: string
  @Column({ type: 'char', length: 36, name: 'season_id' }) seasonId!: string
  @Column({ type: 'char', length: 36, name: 'federation_id' }) federationId!: string
  @Column({ type: 'char', length: 36, nullable: true, name: 'league_id' }) leagueId?: string | null
  @Column({ type: 'date', name: 'inspection_date' }) inspectionDate!: string
  @Column({ type: 'varchar', length: 191, name: 'inspector_user_id' }) inspectorUserId!: string
  @Column({ type: 'enum', enum: ASPECT_STATUSES, default: 'OK', name: 'pitch_status' }) pitchStatus!: StadiumAspectStatus
  @Column({ type: 'enum', enum: ASPECT_STATUSES, default: 'OK', name: 'lighting_status' }) lightingStatus!: StadiumAspectStatus
  @Column({ type: 'enum', enum: ASPECT_STATUSES, default: 'OK', name: 'changing_rooms_status' }) changingRoomsStatus!: StadiumAspectStatus
  @Column({ type: 'enum', enum: ASPECT_STATUSES, default: 'OK', name: 'security_status' }) securityStatus!: StadiumAspectStatus
  @Column({ type: 'enum', enum: ASPECT_STATUSES, default: 'OK', name: 'capacity_status' }) capacityStatus!: StadiumAspectStatus
  @Column({ type: 'enum', enum: ASPECT_STATUSES, default: 'OK', name: 'medical_status' }) medicalStatus!: StadiumAspectStatus
  @Column({ type: 'enum', enum: ASPECT_STATUSES, default: 'OK', name: 'media_status' }) mediaStatus!: StadiumAspectStatus
  @Column({ type: 'enum', enum: ASPECT_STATUSES, nullable: true, name: 'var_status' }) varStatus?: StadiumAspectStatus | null
  @Column({ type: 'text', nullable: true }) observations?: string | null
  @Column({ type: 'enum', enum: STATUSES, default: 'PENDING' }) status!: StadiumInspectionStatus
  @Column({ type: 'date', nullable: true, name: 'expires_at' }) expiresAt?: string | null
  @CreateDateColumn({ type: 'datetime', name: 'created_at' }) createdAt!: Date
  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' }) updatedAt!: Date
}

@Entity({ name: 'stadium_restrictions' })
export class StadiumRestriction {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'inspection_id' }) inspectionId!: string
  @Column({ type: 'text' }) description!: string
  @Column({ type: 'datetime', nullable: true, name: 'lifted_at' }) liftedAt?: Date | null
  @CreateDateColumn({ type: 'datetime', name: 'created_at' }) createdAt!: Date
}

@Entity({ name: 'stadium_inspection_history' })
export class StadiumInspectionHistory {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'inspection_id' }) inspectionId!: string
  @Column({ type: 'varchar', length: 100 }) action!: string
  @Column({ type: 'varchar', length: 32, nullable: true, name: 'from_status' }) fromStatus?: string | null
  @Column({ type: 'varchar', length: 32, nullable: true, name: 'to_status' }) toStatus?: string | null
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'actor_user_id' }) actorUserId?: string | null
  @Column({ type: 'varchar', length: 50, name: 'actor_role' }) actorRole!: string
  @Column({ type: 'text', nullable: true }) reason?: string | null
  @Column({ type: 'json', nullable: true, name: 'after_value' }) afterValue?: Record<string, unknown> | null
  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' }) ipAddress?: string | null
  @Column({ type: 'varchar', length: 512, nullable: true, name: 'user_agent' }) userAgent?: string | null
  @CreateDateColumn({ type: 'datetime', name: 'created_at' }) createdAt!: Date
}
