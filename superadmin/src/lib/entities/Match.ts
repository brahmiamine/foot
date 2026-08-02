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
}


