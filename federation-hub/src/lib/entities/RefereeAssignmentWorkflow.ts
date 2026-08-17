import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export type RefereeAssignmentResponseStatus = 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'DECLINED'
export type RefereeReplacementRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESOLVED'

@Entity('referee_assignment_responses')
@Index(['userId', 'status', 'responseDeadline'])
export class RefereeAssignmentResponse {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number

  @Index({ unique: true })
  @Column({ type: 'bigint', name: 'assignment_id' })
  assignmentId!: number

  @Column({ type: 'varchar', length: 191, name: 'user_id' })
  userId!: string

  @Column({ type: 'enum', enum: ['PENDING_ACCEPTANCE', 'ACCEPTED', 'DECLINED'], default: 'PENDING_ACCEPTANCE' })
  status!: RefereeAssignmentResponseStatus

  @Column({ type: 'datetime', name: 'response_deadline' })
  responseDeadline!: Date

  @Column({ type: 'datetime', nullable: true, name: 'responded_at' })
  respondedAt?: Date | null

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'decline_reason' })
  declineReason?: string | null

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date
}

@Entity('referee_replacement_requests')
@Index(['matchId', 'status', 'createdAt'])
export class RefereeReplacementRequest {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number

  @Column({ type: 'bigint', name: 'assignment_id' })
  assignmentId!: number

  @Column({ type: 'char', length: 36, name: 'match_id' })
  matchId!: string

  @Column({ type: 'varchar', length: 191, name: 'user_id' })
  userId!: string

  @Column({ type: 'varchar', length: 500 })
  reason!: string

  @Column({ type: 'enum', enum: ['PENDING', 'APPROVED', 'REJECTED', 'RESOLVED'], default: 'PENDING' })
  status!: RefereeReplacementRequestStatus

  @Column({ type: 'varchar', length: 191, nullable: true, name: 'reviewed_by' })
  reviewedBy?: string | null

  @Column({ type: 'datetime', nullable: true, name: 'reviewed_at' })
  reviewedAt?: Date | null

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'review_note' })
  reviewNote?: string | null

  @Column({ type: 'bigint', nullable: true, name: 'replacement_assignment_id' })
  replacementAssignmentId?: number | null

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date
}
