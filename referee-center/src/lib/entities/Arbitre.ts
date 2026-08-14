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

  @Column({ type: 'timestamp', nullable: true })
  created_at?: Date

}


