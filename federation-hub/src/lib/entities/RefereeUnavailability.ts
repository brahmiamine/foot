import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

/** Entité de lecture : les écritures appartiennent exclusivement à referee-hub. */
@Entity({ name: 'referee_unavailabilities' })
export class RefereeUnavailability {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number

  @Column({ type: 'varchar', length: 191, name: 'user_id' })
  userId!: string

  @Column({ type: 'date', name: 'start_date' })
  startDate!: string

  @Column({ type: 'date', name: 'end_date' })
  endDate!: string

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason?: string | null

  @Column({ type: 'datetime', nullable: true, name: 'cancelled_at' })
  cancelledAt?: Date | null
}
