import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { FinancialComplianceStatus } from '../../../../packages/regulatory-shared/src/financialCompliance'

const STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'COMPLIANT', 'CONDITIONAL', 'NON_COMPLIANT'] as const

@Entity({ name: 'club_financial_compliance' })
export class FinancialCompliance {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'club_id' }) clubId!: string
  @Column({ type: 'char', length: 36, name: 'season_id' }) seasonId!: string
  @Column({ type: 'char', length: 36, name: 'federation_id' }) federationId!: string
  @Column({ type: 'char', length: 36, nullable: true, name: 'league_id' }) leagueId?: string | null
  @Column({ type: 'enum', enum: STATUSES, default: 'DRAFT' }) status!: FinancialComplianceStatus
  @Column({ type: 'decimal', precision: 15, scale: 3, nullable: true, name: 'budget_forecast' }) budgetForecast?: string | null
  @Column({ type: 'decimal', precision: 15, scale: 3, nullable: true, name: 'payroll_forecast' }) payrollForecast?: string | null
  @Column({ type: 'decimal', precision: 15, scale: 3, default: 0, name: 'player_debts' }) playerDebts!: string
  @Column({ type: 'decimal', precision: 15, scale: 3, default: 0, name: 'staff_debts' }) staffDebts!: string
  @Column({ type: 'decimal', precision: 15, scale: 3, default: 0, name: 'tax_debts' }) taxDebts!: string
  @Column({ type: 'decimal', precision: 15, scale: 3, default: 0, name: 'federation_debts' }) federationDebts!: string
  @Column({ type: 'decimal', precision: 15, scale: 3, default: 0, name: 'other_debts' }) otherDebts!: string
  @Column({ type: 'char', length: 3, default: 'TND' }) currency!: string
  @Column({ type: 'text', nullable: true, name: 'audited_accounts_url' }) auditedAccountsUrl?: string | null
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'auditor_name' }) auditorName?: string | null
  @Column({ type: 'datetime', nullable: true, name: 'submitted_at' }) submittedAt?: Date | null
  @Column({ type: 'datetime', nullable: true, name: 'reviewed_at' }) reviewedAt?: Date | null
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'reviewed_by' }) reviewedBy?: string | null
  @Column({ type: 'text', nullable: true, name: 'review_comment' }) reviewComment?: string | null
  @CreateDateColumn({ type: 'datetime', name: 'created_at' }) createdAt!: Date
  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' }) updatedAt!: Date
}

@Entity({ name: 'club_financial_compliance_history' })
export class FinancialComplianceHistory {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ type: 'char', length: 36, name: 'compliance_id' }) complianceId!: string
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
