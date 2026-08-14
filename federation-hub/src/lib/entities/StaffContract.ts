import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { StaffContractFederalStatus, StaffContractRole, StaffContractStatus } from '../../../../packages/regulatory-shared/src/staffContract'

const ROLES = ['COACH', 'ADJOINT', 'KINE', 'MEDECIN', 'PREPARATEUR', 'ANALYSTE', 'EQUIPEMENTIER', 'COMMUNICATION', 'AUTRE'] as const
const STATUSES = ['DRAFT', 'SIGNED', 'TERMINATED', 'EXPIRED'] as const
const FEDERAL_STATUSES = ['NOT_SUBMITTED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'] as const

@Entity({ name: 'staff_contracts' })
export class StaffContract {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'bigint', name: 'staff_id' }) staffId!: string
  @Column({ type: 'char', length: 36, name: 'club_id' }) clubId!: string
  @Column({ type: 'char', length: 36, name: 'season_id' }) seasonId!: string
  @Column({ type: 'char', length: 36, name: 'federation_id' }) federationId!: string
  @Column({ type: 'char', length: 36, nullable: true, name: 'league_id' }) leagueId?: string | null
  @Column({ type: 'enum', enum: ROLES }) role!: StaffContractRole
  @Column({ type: 'date', name: 'start_date' }) startDate!: string
  @Column({ type: 'date', name: 'end_date' }) endDate!: string
  @Column({ type: 'decimal', precision: 15, scale: 3, nullable: true }) salary?: string | null
  @Column({ type: 'char', length: 3, nullable: true }) currency?: string | null
  @Column({ type: 'char', length: 36, nullable: true, name: 'qualification_id' }) qualificationId?: string | null
  @Column({ type: 'datetime', nullable: true, name: 'signed_at' }) signedAt?: Date | null
  @Column({ type: 'text', nullable: true, name: 'document_url' }) documentUrl?: string | null
  @Column({ type: 'enum', enum: STATUSES, default: 'DRAFT' }) status!: StaffContractStatus
  @Column({ type: 'enum', enum: FEDERAL_STATUSES, default: 'NOT_SUBMITTED', name: 'federation_status' }) federationStatus!: StaffContractFederalStatus
  @Column({ type: 'datetime', nullable: true, name: 'submitted_at' }) submittedAt?: Date | null
  @Column({ type: 'datetime', nullable: true, name: 'review_started_at' }) reviewStartedAt?: Date | null
  @Column({ type: 'datetime', nullable: true, name: 'approved_at' }) approvedAt?: Date | null
  @Column({ type: 'datetime', nullable: true, name: 'rejected_at' }) rejectedAt?: Date | null
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'approved_by' }) approvedBy?: string | null
  @Column({ type: 'text', nullable: true, name: 'rejection_reason' }) rejectionReason?: string | null
  @Column({ type: 'datetime', nullable: true, name: 'terminated_at' }) terminatedAt?: Date | null
  @Column({ type: 'text', nullable: true, name: 'termination_reason' }) terminationReason?: string | null
  @CreateDateColumn({ type: 'datetime', name: 'created_at' }) createdAt!: Date
  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' }) updatedAt!: Date
}

@Entity({ name: 'staff_contract_documents' })
export class StaffContractDocument {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'contract_id' }) contractId!: string
  @Column({ type: 'text', name: 'file_url' }) fileUrl!: string
  @Column({ type: 'varchar', length: 255, name: 'file_name' }) fileName!: string
  @Column({ type: 'varchar', length: 100, name: 'mime_type' }) mimeType!: string
  @Column({ type: 'bigint' }) size!: number
  @Column({ type: 'char', length: 64 }) checksum!: string
  @Column({ type: 'int', unsigned: true }) version!: number
  @Column({ type: 'enum', enum: ['CURRENT', 'SUPERSEDED'], default: 'CURRENT' }) status!: 'CURRENT' | 'SUPERSEDED'
  @Column({ type: 'varchar', length: 191, name: 'uploaded_by' }) uploadedBy!: string
  @Column({ type: 'datetime', name: 'uploaded_at' }) uploadedAt!: Date
}

@Entity({ name: 'staff_contract_history' })
export class StaffContractHistory {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'contract_id' }) contractId!: string
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
