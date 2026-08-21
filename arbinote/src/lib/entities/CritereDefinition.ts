import { Column, Entity, PrimaryColumn } from 'typeorm'

/**
 * ARBI-004 — barème public versionné (append-only) : chaque modification
 * clôture la version en vigueur (`effective_until`) et insère la suivante
 * au lieu de muter en place. `season_id`/`competition_id` NULL = version
 * globale (toutes saisons/compétitions) tant qu'aucune version plus
 * spécifique n'est créée. La PK composite `(id, version)` permet à un même
 * `id` (clé JSON dans `Vote.criteres`) de porter plusieurs versions dans le
 * temps sans jamais changer de sens rétroactivement.
 */
@Entity({ name: 'critere_definitions' })
export class CritereDefinitionEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string

  @PrimaryColumn({ type: 'int', default: 1 })
  version!: number

  @Column({ type: 'varchar', length: 36, nullable: true })
  season_id?: string | null

  @Column({ type: 'varchar', length: 36, nullable: true })
  competition_id?: string | null

  @Column({ type: 'datetime' })
  effective_from!: Date

  @Column({ type: 'datetime', nullable: true })
  effective_until?: Date | null

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
