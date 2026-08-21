import { Column, Entity, PrimaryColumn } from 'typeorm'

/**
 * Barème fédéral privé, distinct de critere_definitions utilisé par les votes
 * publics. REF-007 : chaque modification crée une nouvelle `version` pour le
 * même `id` (append-only, PK composite `id`+`version`) au lieu de muter le
 * poids/label en place — une évaluation déjà écrite (`criteria_effective_at`
 * dans RefereeOfficialEvaluation) continue de résoudre la version qui était
 * active à sa création, jamais la dernière. `season_id`/`competition_id`
 * NULL = version globale (toutes saisons/compétitions) tant qu'aucune
 * version plus spécifique n'est explicitement créée.
 */
@Entity({ name: 'official_referee_criteria' })
export class OfficialRefereeCriterion {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id!: string

  @PrimaryColumn({ type: 'int', default: 1 })
  version!: number

  @Column({ type: 'char', length: 36, nullable: true })
  season_id?: string | null

  @Column({ type: 'char', length: 36, nullable: true })
  competition_id?: string | null

  @Column({ type: 'datetime' })
  effective_from!: Date

  @Column({ type: 'datetime', nullable: true })
  effective_until?: Date | null

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
