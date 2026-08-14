import { Column, Entity, PrimaryColumn } from 'typeorm'

/** Barème fédéral privé, distinct de critere_definitions utilisé par les votes publics. */
@Entity({ name: 'official_referee_criteria' })
export class OfficialRefereeCriterion {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id!: string

  @Column({ type: 'varchar', length: 191 })
  label_fr!: string

  @Column({ type: 'varchar', length: 191, nullable: true })
  label_en?: string | null

  @Column({ type: 'varchar', length: 191, nullable: true })
  label_ar?: string | null

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1 })
  weight!: number

  @Column({ type: 'int', default: 0 })
  display_order!: number

  @Column({ type: 'tinyint', default: 1 })
  is_active!: boolean

  @Column({ type: 'timestamp', nullable: true })
  created_at?: Date

  @Column({ type: 'timestamp', nullable: true })
  updated_at?: Date
}
