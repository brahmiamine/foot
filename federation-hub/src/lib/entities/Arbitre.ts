import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'arbitres' })
export class Arbitre {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 255 })
  nom!: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  nom_en?: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  nom_ar?: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  nationalite?: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  nationalite_ar?: string | null

  @Column({ type: 'date', nullable: true })
  date_naissance?: Date | null

  @Column({ type: 'text', nullable: true })
  photo_url?: string | null

  @Column({ type: 'uuid', nullable: true })
  federation_id?: string | null

  @Column({ type: 'uuid', nullable: true })
  league_id?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  categorie?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  grade?: string | null

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status!: string

  @Column({ type: 'tinyint', default: 1 })
  is_active!: boolean

  @Column({ type: 'date', nullable: true })
  start_date?: Date | null

  @Column({ type: 'timestamp', nullable: true })
  created_at?: Date

}

