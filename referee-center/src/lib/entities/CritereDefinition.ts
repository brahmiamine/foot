import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity({ name: 'critere_definitions' })
export class CritereDefinitionEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string

  @Column({ type: 'varchar', length: 32 })
  categorie!: 'arbitre' | 'var' | 'assistant'

  @Column({ type: 'varchar', length: 255 })
  label_fr!: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  label_en?: string | null

  @Column({ type: 'varchar', length: 255 })
  label_ar!: string

  @Column({ type: 'text', nullable: true })
  description_fr?: string | null

  @Column({ type: 'text', nullable: true })
  description_ar?: string | null

  @Column({ type: 'timestamp', nullable: true })
  created_at?: Date
}


