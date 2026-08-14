import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Federation } from './Federation'

@Entity({ name: 'ligues' })
export class League {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne(() => Federation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'federation_id' })
  federation!: Federation

  @Column({ type: 'uuid' })
  federation_id!: string

  @Column({ type: 'varchar', length: 255 })
  nom!: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  nom_en?: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  nom_ar?: string | null

  @Column({ type: 'text', nullable: true })
  logo_url?: string | null

  @Column({ type: 'boolean', default: true })
  is_active!: boolean

  @Column({ type: 'timestamp', nullable: true })
  created_at?: Date | null
}


