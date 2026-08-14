import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { MedicalEligibilityStatus } from '../../../../packages/regulatory-shared/src/medicalEligibility'

const STATUSES = ['PENDING', 'FIT', 'UNFIT', 'EXPIRED', 'SUSPENDED'] as const

/** Ne jamais ajouter de champ diagnostic ici — migration-v2.md §3.3/§20. */
@Entity({ name: 'medical_eligibilities' })
export class MedicalEligibility {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'varchar', length: 191, name: 'player_id' }) playerId!: string
  @Column({ type: 'char', length: 36, name: 'club_id' }) clubId!: string
  @Column({ type: 'char', length: 36, name: 'season_id' }) seasonId!: string
  @Column({ type: 'char', length: 36, name: 'federation_id' }) federationId!: string
  @Column({ type: 'char', length: 36, nullable: true, name: 'league_id' }) leagueId?: string | null
  @Column({ type: 'date', name: 'examination_date' }) examinationDate!: string
  @Column({ type: 'date', nullable: true, name: 'expires_at' }) expiresAt?: string | null
  @Column({ type: 'enum', enum: STATUSES, default: 'PENDING' }) status!: MedicalEligibilityStatus
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'validated_by_medical_user_id' }) validatedByMedicalUserId?: string | null
  @Column({ type: 'datetime', nullable: true, name: 'validated_at' }) validatedAt?: Date | null
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'certificate_reference' }) certificateReference?: string | null
  @Column({ type: 'text', nullable: true, name: 'document_url' }) documentUrl?: string | null
  @Column({ type: 'varchar', length: 191, name: 'created_by' }) createdBy!: string
  @CreateDateColumn({ type: 'datetime', name: 'created_at' }) createdAt!: Date
  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' }) updatedAt!: Date
}

@Entity({ name: 'medical_eligibility_history' })
export class MedicalEligibilityHistory {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'eligibility_id' }) eligibilityId!: string
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
