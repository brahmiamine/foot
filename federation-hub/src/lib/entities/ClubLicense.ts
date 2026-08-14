import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import type {
  ClubLicenseRequirementCategory,
  ClubLicenseRequirementStatus,
  ClubLicenseStatus,
} from '../../../../packages/regulatory-shared/src/clubLicensing'

@Entity({ name: 'club_license_applications' })
@Index('uq_club_license_club_season', ['clubId', 'seasonId'], { unique: true })
export class ClubLicenseApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'char', length: 36, name: 'club_id' })
  clubId!: string

  @Column({ type: 'char', length: 36, name: 'season_id' })
  seasonId!: string

  @Column({ type: 'char', length: 36, name: 'federation_id' })
  federationId!: string

  @Column({ type: 'char', length: 36, name: 'league_id', nullable: true })
  leagueId!: string | null

  @Column({
    type: 'enum',
    enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'SUSPENDED', 'EXPIRED'],
    default: 'DRAFT',
  })
  status!: ClubLicenseStatus

  @Column({ type: 'datetime', name: 'submitted_at', nullable: true })
  submittedAt!: Date | null

  @Column({ type: 'datetime', name: 'review_started_at', nullable: true })
  reviewStartedAt!: Date | null

  @Column({ type: 'datetime', name: 'approved_at', nullable: true })
  approvedAt!: Date | null

  @Column({ type: 'datetime', name: 'rejected_at', nullable: true })
  rejectedAt!: Date | null

  @Column({ type: 'datetime', name: 'expires_at', nullable: true })
  expiresAt!: Date | null

  @Column({ type: 'varchar', length: 191, name: 'reviewer_user_id', nullable: true })
  reviewerUserId!: string | null

  @Column({ type: 'text', name: 'rejection_reason', nullable: true })
  rejectionReason!: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}

@Entity({ name: 'club_license_requirements' })
@Index('uq_club_license_requirement_code', ['applicationId', 'code'], { unique: true })
export class ClubLicenseRequirement {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'char', length: 36, name: 'application_id' })
  applicationId!: string

  @Column({
    type: 'enum',
    enum: ['SPORTING', 'INFRASTRUCTURE', 'ADMINISTRATIVE', 'LEGAL', 'PERSONNEL', 'MEDICAL', 'FINANCIAL'],
  })
  category!: ClubLicenseRequirementCategory

  @Column({ type: 'varchar', length: 100 })
  code!: string

  @Column({ type: 'varchar', length: 255 })
  label!: string

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Column({ type: 'boolean', default: true })
  mandatory!: boolean

  @Column({ type: 'enum', enum: ['PENDING', 'COMPLIANT', 'NON_COMPLIANT', 'WAIVED'], default: 'PENDING' })
  status!: ClubLicenseRequirementStatus

  @Column({ type: 'text', name: 'review_comment', nullable: true })
  reviewComment!: string | null

  @Column({ type: 'text', name: 'waiver_reason', nullable: true })
  waiverReason!: string | null

  @Column({ type: 'varchar', length: 191, name: 'reviewed_by', nullable: true })
  reviewedBy!: string | null

  @Column({ type: 'datetime', name: 'reviewed_at', nullable: true })
  reviewedAt!: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}

export type ClubLicenseDocumentStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED'

@Entity({ name: 'club_license_documents' })
export class ClubLicenseDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'char', length: 36, name: 'application_id' })
  applicationId!: string

  @Column({ type: 'char', length: 36, name: 'requirement_id', nullable: true })
  requirementId!: string | null

  @Column({ type: 'varchar', length: 100, name: 'document_type' })
  documentType!: string

  @Column({ type: 'text', name: 'file_url' })
  fileUrl!: string

  @Column({ type: 'varchar', length: 255, name: 'file_name' })
  fileName!: string

  @Column({ type: 'varchar', length: 100, name: 'mime_type' })
  mimeType!: string

  @Column({ type: 'bigint' })
  size!: string

  @Column({ type: 'char', length: 64 })
  checksum!: string

  @Column({ type: 'int', default: 1 })
  version!: number

  @Column({ type: 'varchar', length: 191, name: 'uploaded_by' })
  uploadedBy!: string

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt!: Date

  @Column({ type: 'enum', enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'SUPERSEDED'], default: 'PENDING' })
  status!: ClubLicenseDocumentStatus

  @Column({ type: 'text', name: 'review_comment', nullable: true })
  reviewComment!: string | null

  @Column({ type: 'varchar', length: 191, name: 'reviewed_by', nullable: true })
  reviewedBy!: string | null

  @Column({ type: 'datetime', name: 'reviewed_at', nullable: true })
  reviewedAt!: Date | null
}

@Entity({ name: 'club_license_history' })
export class ClubLicenseHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'char', length: 36, name: 'application_id' })
  applicationId!: string

  @Column({ type: 'varchar', length: 100 })
  action!: string

  @Column({ type: 'varchar', length: 32, name: 'from_status', nullable: true })
  fromStatus!: string | null

  @Column({ type: 'varchar', length: 32, name: 'to_status', nullable: true })
  toStatus!: string | null

  @Column({ type: 'varchar', length: 191, name: 'actor_user_id', nullable: true })
  actorUserId!: string | null

  @Column({ type: 'varchar', length: 50, name: 'actor_role' })
  actorRole!: string

  @Column({ type: 'text', nullable: true })
  reason!: string | null

  @Column({ type: 'json', name: 'before_value', nullable: true })
  beforeValue!: Record<string, unknown> | null

  @Column({ type: 'json', name: 'after_value', nullable: true })
  afterValue!: Record<string, unknown> | null

  @Column({ type: 'varchar', length: 45, name: 'ip_address', nullable: true })
  ipAddress!: string | null

  @Column({ type: 'varchar', length: 512, name: 'user_agent', nullable: true })
  userAgent!: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
