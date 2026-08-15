import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { FootballAgentStatus, RepresentationAgreementStatus } from '../../../../packages/regulatory-shared/src/agents'

const AGENT_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED'] as const
const AGREEMENT_STATUSES = ['DRAFT', 'ACTIVE', 'TERMINATED', 'EXPIRED'] as const

@Entity({ name: 'football_agents' })
export class FootballAgent {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'user_id' }) userId?: string | null
  @Column({ type: 'char', length: 36, name: 'federation_id' }) federationId!: string
  @Column({ type: 'varchar', length: 255, name: 'full_name' }) fullName!: string
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'fifa_license_number' }) fifaLicenseNumber?: string | null
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'federation_registration_number' }) federationRegistrationNumber?: string | null
  @Column({ type: 'enum', enum: AGENT_STATUSES, default: 'PENDING' }) status!: FootballAgentStatus
  @Column({ type: 'date', nullable: true, name: 'valid_from' }) validFrom?: string | null
  @Column({ type: 'date', nullable: true, name: 'valid_until' }) validUntil?: string | null
  @Column({ type: 'varchar', length: 255, name: 'contact_email' }) contactEmail!: string
  @Column({ type: 'varchar', length: 30, nullable: true, name: 'contact_phone' }) contactPhone?: string | null
  @Column({ type: 'varchar', length: 191, name: 'created_by' }) createdBy!: string
  @CreateDateColumn({ type: 'datetime', name: 'created_at' }) createdAt!: Date
  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' }) updatedAt!: Date
}

@Entity({ name: 'representation_agreements' })
export class RepresentationAgreement {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'agent_id' }) agentId!: string
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'player_id' }) playerId?: string | null
  @Column({ type: 'char', length: 36, nullable: true, name: 'club_id' }) clubId?: string | null
  @Column({ type: 'date', name: 'start_date' }) startDate!: string
  @Column({ type: 'date', name: 'end_date' }) endDate!: string
  @Column({ type: 'text', nullable: true, name: 'document_url' }) documentUrl?: string | null
  @Column({ type: 'enum', enum: AGREEMENT_STATUSES, default: 'DRAFT' }) status!: RepresentationAgreementStatus
  @Column({ type: 'varchar', length: 191, name: 'created_by' }) createdBy!: string
  @CreateDateColumn({ type: 'datetime', name: 'created_at' }) createdAt!: Date
  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' }) updatedAt!: Date
}

@Entity({ name: 'football_agent_history' })
export class FootballAgentHistory {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'agent_id' }) agentId!: string
  @Column({ type: 'varchar', length: 100 }) action!: string
  @Column({ type: 'varchar', length: 32, nullable: true, name: 'from_status' }) fromStatus?: string | null
  @Column({ type: 'varchar', length: 32, nullable: true, name: 'to_status' }) toStatus?: string | null
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'actor_user_id' }) actorUserId?: string | null
  @Column({ type: 'varchar', length: 50, name: 'actor_role' }) actorRole!: string
  @Column({ type: 'text', nullable: true }) reason?: string | null
  @Column({ type: 'json', nullable: true, name: 'after_value' }) afterValue?: Record<string, unknown> | null
  @CreateDateColumn({ type: 'datetime', name: 'created_at' }) createdAt!: Date
}
