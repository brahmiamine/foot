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

  /**
   * Écrit uniquement par `matchsheet` (démarrage/fin réels de la feuille de
   * match) et par `superadmin` (CANCELLED). ArbiNote ne l'écrit jamais,
   * seulement le lit pour n'autoriser les votes que sur un match réellement
   * commencé — voir canVoteMatch dans lib/utils.ts.
   */
  @Column({ type: 'enum', enum: ['UPCOMING', 'IN_PROGRESS', 'FINISHED', 'CANCELLED'], default: 'UPCOMING' })
  status!: 'UPCOMING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'

  @Column({ type: 'datetime', nullable: true, name: 'actual_started_at' })
  actual_started_at?: Date | null

  @Column({ type: 'datetime', nullable: true, name: 'actual_finished_at' })
  actual_finished_at?: Date | null

  @Column({ type: 'timestamp', nullable: true })
  created_at?: Date
}


