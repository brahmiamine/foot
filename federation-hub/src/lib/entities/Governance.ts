import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { BoardMandateStatus, BoardMemberRole } from '../../../../packages/regulatory-shared/src/governance'

const ROLES = ['PRESIDENT', 'VICE_PRESIDENT', 'GENERAL_SECRETARY', 'TREASURER', 'BOARD_MEMBER', 'OTHER'] as const
const STATUSES = ['DRAFT', 'SUBMITTED', 'VALIDATED', 'REJECTED', 'ENDED'] as const

@Entity({ name: 'club_board_mandates' })
export class BoardMandate {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'club_id' }) clubId!: string
  @Column({ type: 'char', length: 36, name: 'federation_id' }) federationId!: string
  @Column({ type: 'char', length: 36, nullable: true, name: 'league_id' }) leagueId?: string | null
  @Column({ type: 'date', name: 'starts_at' }) startsAt!: string
  @Column({ type: 'date', name: 'ends_at' }) endsAt!: string
  @Column({ type: 'enum', enum: STATUSES, default: 'DRAFT' }) status!: BoardMandateStatus
  @Column({ type: 'text', nullable: true, name: 'election_document_url' }) electionDocumentUrl?: string | null
  @Column({ type: 'datetime', nullable: true, name: 'submitted_at' }) submittedAt?: Date | null
  @Column({ type: 'datetime', nullable: true, name: 'federation_validated_at' }) federationValidatedAt?: Date | null
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'validated_by' }) validatedBy?: string | null
  @Column({ type: 'text', nullable: true, name: 'rejection_reason' }) rejectionReason?: string | null
  @Column({ type: 'varchar', length: 191, name: 'created_by' }) createdBy!: string
  @CreateDateColumn({ type: 'datetime', name: 'created_at' }) createdAt!: Date
  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' }) updatedAt!: Date
}

@Entity({ name: 'club_board_members' })
export class BoardMember {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'mandate_id' }) mandateId!: string
  @Column({ type: 'varchar', length: 255, name: 'person_name' }) personName!: string
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'user_id' }) userId?: string | null
  @Column({ type: 'enum', enum: ROLES }) role!: BoardMemberRole
  @Column({ type: 'date', name: 'starts_at' }) startsAt!: string
  @Column({ type: 'date', nullable: true, name: 'ends_at' }) endsAt?: string | null
  @Column({ type: 'text', nullable: true, name: 'appointment_document_url' }) appointmentDocumentUrl?: string | null
  @Column({ type: 'boolean', default: false, name: 'federation_approved' }) federationApproved!: boolean
  @CreateDateColumn({ type: 'datetime', name: 'created_at' }) createdAt!: Date
  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' }) updatedAt!: Date
}

@Entity({ name: 'club_board_mandate_history' })
export class BoardMandateHistory {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'mandate_id' }) mandateId!: string
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
