import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Journee } from './Journee'
import { Team } from './Team'
import { Arbitre } from './Arbitre'

@Entity({ name: 'matches' })
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne(() => Journee, undefined, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'journee_id' })
  journee!: Journee

  @Column({ name: 'journee_id', type: 'uuid' })
  journee_id!: string

  @ManyToOne(() => Team, undefined, { eager: false })
  @JoinColumn({ name: 'equipe_home' })
  equipe_home!: Team

  @Column({ name: 'equipe_home', type: 'uuid' })
  equipe_home_id!: string

  @ManyToOne(() => Team, undefined, { eager: false })
  @JoinColumn({ name: 'equipe_away' })
  equipe_away!: Team

  @Column({ name: 'equipe_away', type: 'uuid' })
  equipe_away_id!: string

  @ManyToOne(() => Arbitre, undefined, { nullable: true })
  @JoinColumn({ name: 'arbitre_id' })
  arbitre?: Arbitre | null

  @Column({ name: 'arbitre_id', type: 'uuid', nullable: true })
  arbitre_id?: string | null

  @Column({ type: 'datetime', nullable: true })
  date?: Date | null

  @Column({ type: 'int', nullable: true })
  score_home?: number | null

  @Column({ type: 'int', nullable: true })
  score_away?: number | null

  @Column({ type: 'timestamp', nullable: true })
  created_at?: Date

  /**
   * Écrit par `match-operations` (IN_PROGRESS/FINISHED, seul endroit qui sait
   * avec certitude quand un match démarre/finit) et par `federation-hub`
   * (CANCELLED uniquement, voir cancelMatchAdmin dans adminMatches.ts) —
   * jamais IN_PROGRESS/FINISHED depuis cette app. Colonne déjà présente
   * dans le schéma partagé (voir db/OWNERSHIP.md, "matches.status").
   */
  @Column({ type: 'enum', enum: ['UPCOMING', 'IN_PROGRESS', 'FINISHED', 'CANCELLED'], default: 'UPCOMING' })
  status!: 'UPCOMING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'

  /**
   * Écrit par `match-operations` uniquement. `federation-hub` les lit pour l'audit et
   * les nettoie sur réouverture d'un match `FINISHED` (voir reopenMatchAdmin
   * dans adminMatches.ts) mais ne les fixe jamais lui-même.
   */
  @Column({ type: 'datetime', nullable: true, name: 'actual_started_at' })
  actual_started_at?: Date | null

  @Column({ type: 'datetime', nullable: true, name: 'actual_finished_at' })
  actual_finished_at?: Date | null
}


