import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Match } from './Match'

export type AlertType = 'critical' | 'important'
export type AlertStatus = 'new' | 'reviewed' | 'resolved' | 'dismissed'

@Entity({ name: 'vote_alerts' })
export class VoteAlert {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne(() => Match, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'match_id' })
  match!: Match

  @Column({ type: 'uuid' })
  match_id!: string

  @Column({
    type: 'enum',
    enum: ['critical', 'important'],
    default: 'important',
  })
  alert_type!: AlertType

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
  confidence!: number

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  credibility!: number

  @Column({ type: 'json', nullable: true })
  reasons?: string[] | null

  @Column({
    type: 'enum',
    enum: ['new', 'reviewed', 'resolved', 'dismissed'],
    default: 'new',
  })
  status!: AlertStatus

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date

  @Column({ type: 'datetime', nullable: true })
  reviewed_at?: Date | null

  @Column({ type: 'varchar', length: 36, nullable: true })
  reviewed_by?: string | null

  @Column({ type: 'text', nullable: true })
  notes?: string | null
}

