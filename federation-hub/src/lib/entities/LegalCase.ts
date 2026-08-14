import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { LegalCaseCategory, LegalCasePartyType, LegalCaseStatus } from '../../../../packages/regulatory-shared/src/legalCase'

const CATEGORIES = ['PLAYER_CLUB', 'COACH_CLUB', 'STAFF_CLUB', 'AGENT_PLAYER', 'AGENT_CLUB', 'CLUB_CLUB', 'CONTRACT', 'TRANSFER', 'DISCIPLINARY', 'FINANCIAL', 'OTHER'] as const
const PARTY_TYPES = ['CLUB', 'PLAYER', 'COACH', 'STAFF', 'AGENT', 'FEDERATION', 'OTHER'] as const
const STATUSES = ['FILED', 'ADMISSIBILITY_REVIEW', 'INADMISSIBLE', 'UNDER_REVIEW', 'HEARING_SCHEDULED', 'HEARD', 'DECIDED', 'APPEALED', 'CLOSED', 'WITHDRAWN'] as const

@Entity({ name: 'legal_cases' })
export class LegalCase {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'varchar', length: 32, name: 'case_number' }) caseNumber!: string
  @Column({ type: 'char', length: 36, name: 'federation_id' }) federationId!: string
  @Column({ type: 'char', length: 36, nullable: true, name: 'league_id' }) leagueId?: string | null
  @Column({ type: 'char', length: 36, nullable: true, name: 'season_id' }) seasonId?: string | null
  @Column({ type: 'enum', enum: CATEGORIES }) category!: LegalCaseCategory
  @Column({ type: 'enum', enum: PARTY_TYPES, name: 'claimant_type' }) claimantType!: LegalCasePartyType
  @Column({ type: 'varchar', length: 191, name: 'claimant_id' }) claimantId!: string
  @Column({ type: 'enum', enum: PARTY_TYPES, name: 'respondent_type' }) respondentType!: LegalCasePartyType
  @Column({ type: 'varchar', length: 191, name: 'respondent_id' }) respondentId!: string
  @Column({ type: 'text' }) subject!: string
  @Column({ type: 'enum', enum: STATUSES, default: 'FILED' }) status!: LegalCaseStatus
  @Column({ type: 'datetime', name: 'filed_at' }) filedAt!: Date
  @Column({ type: 'datetime', nullable: true, name: 'admissibility_reviewed_at' }) admissibilityReviewedAt?: Date | null
  @Column({ type: 'datetime', nullable: true, name: 'hearing_date' }) hearingDate?: Date | null
  @Column({ type: 'datetime', nullable: true, name: 'decided_at' }) decidedAt?: Date | null
  @Column({ type: 'text', nullable: true, name: 'decision_summary' }) decisionSummary?: string | null
  @Column({ type: 'decimal', precision: 15, scale: 3, nullable: true, name: 'amount_awarded' }) amountAwarded?: string | null
  @Column({ type: 'char', length: 3, nullable: true }) currency?: string | null
  @Column({ type: 'datetime', nullable: true }) deadline?: Date | null
  @Column({ type: 'varchar', length: 191, name: 'created_by' }) createdBy!: string
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'assigned_to' }) assignedTo?: string | null
  @CreateDateColumn({ type: 'datetime', name: 'created_at' }) createdAt!: Date
  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' }) updatedAt!: Date
}

@Entity({ name: 'legal_case_documents' })
export class LegalCaseDocument {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'case_id' }) caseId!: string
  @Column({ type: 'text', name: 'file_url' }) fileUrl!: string
  @Column({ type: 'varchar', length: 255, name: 'file_name' }) fileName!: string
  @Column({ type: 'varchar', length: 100, name: 'mime_type' }) mimeType!: string
  @Column({ type: 'bigint' }) size!: number
  @Column({ type: 'char', length: 64 }) checksum!: string
  @Column({ type: 'int', unsigned: true }) version!: number
  @Column({ type: 'enum', enum: ['CLAIMANT', 'RESPONDENT', 'FEDERATION'], name: 'submitted_by_type' }) submittedByType!: 'CLAIMANT' | 'RESPONDENT' | 'FEDERATION'
  @Column({ type: 'varchar', length: 191, name: 'uploaded_by' }) uploadedBy!: string
  @Column({ type: 'datetime', name: 'uploaded_at' }) uploadedAt!: Date
}

@Entity({ name: 'legal_case_hearings' })
export class LegalCaseHearing {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'case_id' }) caseId!: string
  @Column({ type: 'datetime', name: 'scheduled_at' }) scheduledAt!: Date
  @Column({ type: 'varchar', length: 255, nullable: true }) location?: string | null
  @Column({ type: 'enum', enum: ['IN_PERSON', 'REMOTE', 'WRITTEN'], default: 'IN_PERSON' }) mode!: 'IN_PERSON' | 'REMOTE' | 'WRITTEN'
  @Column({ type: 'text', nullable: true }) notes?: string | null
  @Column({ type: 'boolean', default: false }) held!: boolean
  @Column({ type: 'varchar', length: 191, name: 'created_by' }) createdBy!: string
  @CreateDateColumn({ type: 'datetime', name: 'created_at' }) createdAt!: Date
}

@Entity({ name: 'legal_case_decisions' })
export class LegalCaseDecision {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'case_id' }) caseId!: string
  @Column({ type: 'text' }) summary!: string
  @Column({ type: 'text', nullable: true, name: 'full_text_url' }) fullTextUrl?: string | null
  @Column({ type: 'decimal', precision: 15, scale: 3, nullable: true, name: 'amount_awarded' }) amountAwarded?: string | null
  @Column({ type: 'char', length: 3, nullable: true }) currency?: string | null
  @Column({ type: 'boolean', default: false, name: 'sanction_issued' }) sanctionIssued!: boolean
  @Column({ type: 'varchar', length: 191, name: 'decided_by' }) decidedBy!: string
  @Column({ type: 'datetime', name: 'decided_at' }) decidedAt!: Date
}

@Entity({ name: 'legal_case_events' })
export class LegalCaseEvent {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'case_id' }) caseId!: string
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
