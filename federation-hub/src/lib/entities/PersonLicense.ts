import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { PersonLicenseStatus, PersonLicenseType } from '../../../../packages/regulatory-shared/src/personLicensing'

const PERSON_TYPES = ['PLAYER', 'COACH', 'STAFF', 'MEDICAL', 'DIRECTOR', 'REFEREE', 'MATCH_OFFICIAL'] as const
const PERSON_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'EXPIRED', 'REVOKED'] as const

@Entity({ name: 'person_licenses' })
export class PersonLicense {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'enum', enum: PERSON_TYPES, name: 'person_type' }) personType!: PersonLicenseType
  @Column({ type: 'varchar', length: 191, name: 'person_reference_id' }) personReferenceId!: string
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'user_id' }) userId?: string | null
  @Column({ type: 'char', length: 36, nullable: true, name: 'club_id' }) clubId?: string | null
  @Column({ type: 'char', length: 36, name: 'federation_id' }) federationId!: string
  @Column({ type: 'char', length: 36, nullable: true, name: 'league_id' }) leagueId?: string | null
  @Column({ type: 'char', length: 36, name: 'season_id' }) seasonId!: string
  @Column({ type: 'varchar', length: 100, name: 'license_type' }) licenseType!: string
  @Column({ type: 'varchar', length: 100, nullable: true, unique: true, name: 'license_number' }) licenseNumber?: string | null
  @Column({ type: 'varchar', length: 100, nullable: true }) category?: string | null
  @Column({ type: 'enum', enum: PERSON_STATUSES, default: 'DRAFT' }) status!: PersonLicenseStatus
  @Column({ type: 'datetime', nullable: true, name: 'requested_at' }) requestedAt?: Date | null
  @Column({ type: 'datetime', nullable: true, name: 'review_started_at' }) reviewStartedAt?: Date | null
  @Column({ type: 'datetime', nullable: true, name: 'approved_at' }) approvedAt?: Date | null
  @Column({ type: 'datetime', nullable: true, name: 'rejected_at' }) rejectedAt?: Date | null
  @Column({ type: 'datetime', nullable: true, name: 'expires_at' }) expiresAt?: Date | null
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'approved_by' }) approvedBy?: string | null
  @Column({ type: 'text', nullable: true, name: 'rejection_reason' }) rejectionReason?: string | null
  @CreateDateColumn({ type: 'datetime', name: 'created_at' }) createdAt!: Date
  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' }) updatedAt!: Date
}

@Entity({ name: 'person_license_documents' })
export class PersonLicenseDocument {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'license_id' }) licenseId!: string
  @Column({ type: 'varchar', length: 100, name: 'document_type' }) documentType!: string
  @Column({ type: 'text', name: 'file_url' }) fileUrl!: string
  @Column({ type: 'varchar', length: 255, name: 'file_name' }) fileName!: string
  @Column({ type: 'varchar', length: 100, name: 'mime_type' }) mimeType!: string
  @Column({ type: 'bigint' }) size!: number
  @Column({ type: 'char', length: 64 }) checksum!: string
  @Column({ type: 'int', unsigned: true, default: 1 }) version!: number
  @Column({ type: 'enum', enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'SUPERSEDED'], default: 'PENDING' }) status!: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED'
  @Column({ type: 'text', nullable: true, name: 'review_comment' }) reviewComment?: string | null
  @Column({ type: 'varchar', length: 191, name: 'uploaded_by' }) uploadedBy!: string
  @Column({ type: 'datetime', name: 'uploaded_at' }) uploadedAt!: Date
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'reviewed_by' }) reviewedBy?: string | null
  @Column({ type: 'datetime', nullable: true, name: 'reviewed_at' }) reviewedAt?: Date | null
}

@Entity({ name: 'person_license_history' })
export class PersonLicenseHistory {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'license_id' }) licenseId!: string
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
