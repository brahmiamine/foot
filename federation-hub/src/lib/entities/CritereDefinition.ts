import { Column, Entity, PrimaryColumn } from 'typeorm'

/**
 * ARBI-004 — barème public versionné (append-only), même schéma que
 * `arbinote/src/lib/entities/CritereDefinition.ts` (table partagée). Ne
 * jamais muter une version en place depuis ce fichier : voir
 * `lib/officialCriteresPublic.ts` pour la création/mise à jour/retrait.
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
