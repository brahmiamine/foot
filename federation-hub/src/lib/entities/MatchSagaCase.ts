import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export type MatchSagaType = 'CANCEL' | 'RESCHEDULE'
export type MatchSagaStatus = 'IN_PROGRESS' | 'COMPLETED' | 'MANUAL_REVIEW'
export type TicketPolicy = 'VALID_FOR_NEW_DATE' | 'REFUND'

/**
 * TASK-P0-003 (todo.md) : journal de la saga d'annulation/report d'un
 * match — un dossier par déclenchement, ses étapes détaillées vivent dans
 * MatchSagaStep (append-only). `matches.status` bascule immédiatement et
 * de façon synchrone (voir cancelMatchAdmin/rescheduleMatchAdmin) : rien
 * dans ce dossier ne peut empêcher ou retarder cette écriture, la saga ne
 * fait que compenser côté ticketing/club-hub ensuite. Un dossier
 * `MANUAL_REVIEW` signale qu'au moins une étape a échoué après ses
 * tentatives automatiques et attend soit une nouvelle tentative manuelle
 * (voir /api/admin/match-sagas/[id]/retry), soit la convergence du
 * scheduler autonome de l'app concernée (ticketing/club-hub,
 * filet de sécurité indépendant de ce dossier).
 */
@Entity({ name: 'match_saga_cases' })
export class MatchSagaCase {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'char', length: 36, name: 'match_id' })
  match_id!: string

  @Column({ type: 'enum', enum: ['CANCEL', 'RESCHEDULE'], name: 'saga_type' })
  saga_type!: MatchSagaType

  // Versionné explicitement (critère TASK-P0-003) : permet de faire évoluer
  // la forme de l'événement (nouvelles étapes, nouveaux champs) sans casser
  // la lecture de dossiers déjà persistés avec une version antérieure.
  @Column({ type: 'int', name: 'event_version', default: 1 })
  event_version!: number

  @Column({ type: 'text' })
  reason!: string

  @Column({ type: 'datetime', nullable: true, name: 'new_date' })
  new_date?: Date | null

  @Column({ type: 'enum', enum: ['VALID_FOR_NEW_DATE', 'REFUND'], nullable: true, name: 'ticket_policy' })
  ticket_policy?: TicketPolicy | null

  @Column({ type: 'enum', enum: ['IN_PROGRESS', 'COMPLETED', 'MANUAL_REVIEW'], default: 'IN_PROGRESS' })
  status!: MatchSagaStatus

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'initiated_by' })
  initiated_by?: string | null

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date
}
