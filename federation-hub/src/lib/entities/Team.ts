import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm'

export type TeamType = 'club' | 'national'
export type Sport = 'football' | 'handball' | 'basketball' | 'volleyball'
export type AgeCategory =
  | 'seniors'
  | 'u21' | 'u20' | 'u19' | 'u18' | 'u17' | 'u16' | 'u15' | 'u14' | 'u13'
  | 'u12' | 'u11' | 'u10' | 'u9' | 'u8' | 'u7'
export type Gender = 'male' | 'female' | 'mixed'

@Entity({ name: 'teams' })
@Unique(['abbr'])
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 16, nullable: true })
  abbr?: string | null

  @Column({ type: 'varchar', length: 255 })
  nom!: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  nom_en?: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  nom_ar?: string | null

  @Column({ 
    type: 'enum', 
    enum: ['club', 'national'],
    default: 'club'
  })
  team_type!: TeamType

  @Column({ type: 'varchar', length: 3, nullable: true })
  country_code?: string | null

  @Column({ 
    type: 'enum', 
    enum: ['football', 'handball', 'basketball', 'volleyball'],
    default: 'football'
  })
  sport!: Sport

  @Column({
    type: 'enum',
    enum: [
      'seniors',
      'u21', 'u20', 'u19', 'u18', 'u17', 'u16', 'u15', 'u14', 'u13',
      'u12', 'u11', 'u10', 'u9', 'u8', 'u7',
    ],
    default: 'seniors'
  })
  age_category!: AgeCategory

  @Column({
    type: 'enum',
    enum: ['male', 'female', 'mixed'],
    default: 'male'
  })
  gender!: Gender

  @Column({ type: 'varchar', length: 255, nullable: true })
  city?: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  city_ar?: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  city_en?: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  stadium?: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  stadium_ar?: string | null

  @Column({ type: 'text', nullable: true })
  logo_url?: string | null

  @Column({ type: 'timestamp', nullable: true })
  created_at?: Date
}
