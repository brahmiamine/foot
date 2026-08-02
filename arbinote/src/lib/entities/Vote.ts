import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Match } from './Match'
import { Arbitre } from './Arbitre'

@Entity({ name: 'votes' })
@Index('uniq_votes_match_device', ['match_id', 'device_fingerprint'], { unique: true })
export class Vote {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne(() => Match, (match) => match.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'match_id' })
  match!: Match

  @Column({ type: 'uuid' })
  match_id!: string

  @ManyToOne(() => Arbitre, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'arbitre_id' })
  arbitre!: Arbitre

  @Column({ type: 'uuid' })
  arbitre_id!: string

  @Column({ type: 'json' })
  criteres!: Record<string, number>

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  note_globale!: number

  @Column({ type: 'varchar', length: 255, nullable: true })
  device_fingerprint?: string | null

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address?: string | null

  @Column({
    type: 'enum',
    enum: ['pending', 'validated', 'excluded'],
    default: 'pending',
  })
  moderation_status?: 'pending' | 'validated' | 'excluded'

  @Column({ type: 'datetime', nullable: true })
  moderated_at?: Date | null

  @Column({ type: 'varchar', length: 36, nullable: true })
  moderated_by?: string | null

  @Column({ type: 'text', nullable: true })
  moderation_notes?: string | null

  @Column({ type: 'timestamp', nullable: true })
  created_at?: Date
}


