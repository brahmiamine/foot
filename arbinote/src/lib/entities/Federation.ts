import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'federations' })
export class Federation {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 8 })
  code!: string

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


