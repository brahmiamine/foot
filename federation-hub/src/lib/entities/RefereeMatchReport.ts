import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Match } from './Match'
import { User } from './User'

/** Entité de lecture : brouillons et envois sont possédés par referee-hub. */
@Entity({ name: 'referee_match_reports' })
export class RefereeMatchReport {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number

  @Column({ type: 'bigint', name: 'assignment_id' })
  assignmentId!: number

  @Column({ type: 'char', length: 36, name: 'match_id' })
  matchId!: string

  @ManyToOne(() => Match, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'match_id' })
  match?: Match

  @Column({ type: 'varchar', length: 191, name: 'user_id' })
  userId!: string

  @ManyToOne(() => User, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'user_id' })
  author?: User

  @Column({ type: 'varchar', length: 64 })
  role!: string

  @Column({ type: 'varchar', length: 180 })
  subject!: string

  @Column({ type: 'text' })
  content!: string

  @Column({ type: 'enum', enum: ['DRAFT', 'SUBMITTED'] })
  status!: 'DRAFT' | 'SUBMITTED'

  @Column({ type: 'datetime', nullable: true, name: 'submitted_at' })
  submittedAt?: Date | null
}
