import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { DisciplinaryCaseStatus, DisciplinaryPersonType } from '../../../../packages/regulatory-shared/src/disciplinaryCase'

const PERSON_TYPES = ['PLAYER', 'COACH', 'STAFF', 'REFEREE', 'AGENT', 'OTHER'] as const
const STATUSES = ['OPEN', 'UNDER_REVIEW', 'HEARING_SCHEDULED', 'DECIDED', 'APPEALED', 'CLOSED'] as const

@Entity({ name: 'disciplinary_cases' })
export class DisciplinaryCase {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'varchar', length: 32, name: 'case_number' }) caseNumber!: string
  @Column({ type: 'char', length: 36, name: 'federation_id' }) federationId!: string
  @Column({ type: 'char', length: 36, nullable: true, name: 'league_id' }) leagueId?: string | null
  @Column({ type: 'char', length: 36, nullable: true, name: 'match_id' }) matchId?: string | null
  @Column({ type: 'char', length: 36, nullable: true, name: 'club_id' }) clubId?: string | null
  @Column({ type: 'enum', enum: PERSON_TYPES, nullable: true, name: 'person_type' }) personType?: DisciplinaryPersonType | null
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'person_id' }) personId?: string | null
  @Column({ type: 'varchar', length: 191, name: 'offense_type' }) offenseType!: string
  @Column({ type: 'text' }) description!: string
  @Column({ type: 'enum', enum: STATUSES, default: 'OPEN' }) status!: DisciplinaryCaseStatus
  @Column({ type: 'datetime', name: 'opened_at' }) openedAt!: Date
  @Column({ type: 'datetime', nullable: true, name: 'hearing_date' }) hearingDate?: Date | null
  @Column({ type: 'datetime', nullable: true, name: 'decision_date' }) decisionDate?: Date | null
  @Column({ type: 'varchar', length: 191, name: 'created_by' }) createdBy!: string
  @CreateDateColumn({ type: 'datetime', name: 'created_at' }) createdAt!: Date
  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' }) updatedAt!: Date
}

@Entity({ name: 'disciplinary_case_evidence' })
export class DisciplinaryCaseEvidence {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'case_id' }) caseId!: string
  @Column({ type: 'text', name: 'file_url' }) fileUrl!: string
  @Column({ type: 'varchar', length: 255, name: 'file_name' }) fileName!: string
  @Column({ type: 'text', nullable: true }) description?: string | null
  @Column({ type: 'varchar', length: 191, name: 'uploaded_by' }) uploadedBy!: string
  @Column({ type: 'datetime', name: 'uploaded_at' }) uploadedAt!: Date
}

@Entity({ name: 'disciplinary_case_hearings' })
export class DisciplinaryCaseHearing {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'case_id' }) caseId!: string
  @Column({ type: 'datetime', name: 'scheduled_at' }) scheduledAt!: Date
  @Column({ type: 'varchar', length: 255, nullable: true }) location?: string | null
  @Column({ type: 'text', nullable: true }) notes?: string | null
  @Column({ type: 'varchar', length: 191, name: 'created_by' }) createdBy!: string
  @CreateDateColumn({ type: 'datetime', name: 'created_at' }) createdAt!: Date
}

@Entity({ name: 'disciplinary_case_decisions' })
export class DisciplinaryCaseDecision {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'case_id' }) caseId!: string
  @Column({ type: 'text' }) summary!: string
  @Column({ type: 'text', nullable: true, name: 'sanction_description' }) sanctionDescription?: string | null
  @Column({ type: 'char', length: 36, nullable: true, name: 'club_sanction_id' }) clubSanctionId?: string | null
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'suspension_id' }) suspensionId?: string | null
  @Column({ type: 'varchar', length: 191, name: 'decided_by' }) decidedBy!: string
  @Column({ type: 'datetime', name: 'decided_at' }) decidedAt!: Date
}

@Entity({ name: 'disciplinary_case_events' })
export class DisciplinaryCaseEvent {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'case_id' }) caseId!: string
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
