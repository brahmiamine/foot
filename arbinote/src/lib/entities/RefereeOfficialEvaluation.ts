import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Match } from './Match'
import { Arbitre } from './Arbitre'

export type RefereeOfficialEvaluationStatus = 'DRAFT' | 'SUBMITTED' | 'VALIDATED' | 'REJECTED'

/**
 * migration.md §12 (Phase 5) : évaluation fédérale OFFICIELLE d'un arbitre,
 * strictement séparée de la notation publique (`votes` — supporters,
 * anti-fraude, classement bayésien, aucune conséquence réglementaire).
 * Table, service et routes entièrement distincts : aucun code ne doit
 * jamais fusionner `votes.note_globale` et `note_officielle` ci-dessous
 * (voir RefereeOfficialEvaluationService, qui n'importe jamais VoteService).
 *
 * Écrite par un compte `REFEREE_OBSERVER` (auteur du rapport) puis validée
 * par un `FEDERATION_ADMIN` (homologation, §9) — jamais par le public.
 */
@Entity({ name: 'referee_official_evaluations' })
@Index('uniq_official_eval_match_arbitre_observer', ['match_id', 'arbitre_id', 'observer_user_id'], { unique: true })
export class RefereeOfficialEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne(() => Match, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match?: Match

  @Column({ type: 'uuid' })
  match_id!: string

  @ManyToOne(() => Arbitre, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'arbitre_id' })
  arbitre?: Arbitre

  @Column({ type: 'uuid' })
  arbitre_id!: string

  /** `User.id` (sso) du compte REFEREE_OBSERVER auteur du rapport. */
  @Column({ type: 'varchar', length: 191 })
  observer_user_id!: string

  /** Critères techniques (barème fédéral) — namespace séparé de `votes.criteres` (barème public), même si certains libellés se recoupent via `critere_definitions`. */
  @Column({ type: 'json' })
  criteres!: Record<string, number>

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  note_officielle!: number

  @Column({ type: 'text', nullable: true })
  points_forts?: string | null

  @Column({ type: 'text', nullable: true })
  points_faibles?: string | null

  @Column({ type: 'text', nullable: true })
  recommandations?: string | null

  @Column({ type: 'enum', enum: ['DRAFT', 'SUBMITTED', 'VALIDATED', 'REJECTED'], default: 'DRAFT' })
  status!: RefereeOfficialEvaluationStatus

  @Column({ type: 'datetime', nullable: true })
  submitted_at?: Date | null

  /** Identité du FEDERATION_ADMIN ayant validé/rejeté — pas de FK vers `User` (compte staff superadmin, pas un compte arbinote). */
  @Column({ type: 'varchar', length: 191, nullable: true })
  validated_by?: string | null

  @Column({ type: 'datetime', nullable: true })
  validated_at?: Date | null

  @Column({ type: 'text', nullable: true })
  rejection_reason?: string | null

  @Column({ type: 'timestamp', nullable: true })
  created_at?: Date

  @Column({ type: 'timestamp', nullable: true })
  updated_at?: Date
}
