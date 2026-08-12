import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

export type SheetStatus = 'DRAFT' | 'PRE_MATCH_SIGNED' | 'IN_PROGRESS' | 'POST_MATCH_SIGNED' | 'CLOSED'

/**
 * Mapping minimal en lecture/écriture de `ms_sheets`, table propriété de
 * `matchsheet` (voir db/OWNERSHIP.md). Seules les colonnes nécessaires à la
 * réouverture pilotée par `superadmin` sont déclarées ici (pas de relation
 * vers `Match`, pas de colonnes de signature) : SUPERADMIN n'a jamais accès
 * à `matchsheet` (choix produit assumé, voir matchsheet/src/middleware.ts),
 * donc une réouverture de feuille approuvée par un SUPERADMIN doit être
 * pilotée depuis ici — exception documentée et étroite, du même type que
 * celle déjà en place pour `matches.status` (CANCELLED, voir adminMatches.ts),
 * jamais un accès général à `ms_sheets`.
 */
@Entity('ms_sheets')
export class Sheet {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number

  @Column({ type: 'char', length: 36, name: 'match_id' })
  matchId!: string

  @Column({ type: 'enum', enum: ['DRAFT', 'PRE_MATCH_SIGNED', 'IN_PROGRESS', 'POST_MATCH_SIGNED', 'CLOSED'], default: 'DRAFT' })
  status!: SheetStatus

  @Column({ type: 'datetime', nullable: true, name: 'closed_at' })
  closedAt?: Date | null
}
