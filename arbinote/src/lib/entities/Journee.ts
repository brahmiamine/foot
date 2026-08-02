import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Saison } from './Saison'

@Entity({ name: 'journees' })
export class Journee {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne(() => Saison, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'saison_id' })
  saison!: Saison

  @Column({ type: 'uuid' })
  saison_id!: string

  @Column({ type: 'int', nullable: true })
  numero?: number | null

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'nom_fr' })
  nom_fr?: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  nom_en?: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  nom_ar?: string | null

  @Column({ type: 'date', nullable: true })
  date_journee?: Date | null

  @Column({ type: 'timestamp', nullable: true })
  created_at?: Date

}


