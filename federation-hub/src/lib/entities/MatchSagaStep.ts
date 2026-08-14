import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

export type MatchSagaStepName = 'BILLETTERIE_TICKETS' | 'TEAMMANAGER_CONVOCATIONS'
export type MatchSagaStepStatus = 'SUCCEEDED' | 'FAILED'

/**
 * TASK-P0-003 (todo.md) : une ligne par tentative d'étape de saga —
 * append-only (jamais de mise à jour d'une ligne existante), même pattern
 * que RefundStatusHistory (payments) et ms_event_corrections
 * (match-operations) : l'historique complet des tentatives/échecs reste
 * consultable, pas seulement le dernier état.
 */
@Entity({ name: 'match_saga_steps' })
export class MatchSagaStep {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'char', length: 36, name: 'saga_id' })
  saga_id!: string

  @Column({ type: 'enum', enum: ['BILLETTERIE_TICKETS', 'TEAMMANAGER_CONVOCATIONS'] })
  step!: MatchSagaStepName

  @Column({ type: 'enum', enum: ['SUCCEEDED', 'FAILED'] })
  status!: MatchSagaStepStatus

  @Column({ type: 'int' })
  attempt!: number

  @Column({ type: 'text', nullable: true })
  error?: string | null

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date
}
