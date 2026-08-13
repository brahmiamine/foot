import { Column, Entity, PrimaryColumn } from 'typeorm'

/**
 * Mappée sur `Player` (table `teamManager`, référentiel effectif club) —
 * lecture seule ici (`teamManager` reste seul propriétaire, voir
 * db/OWNERSHIP.md). Utilisée pour afficher les noms de joueurs dans le fil
 * des faits de match (buts/cartons/blessures/remplacements) et, depuis
 * migration.md §18, pour la vue globale `/admin/joueurs` — d'où les
 * colonnes `category`/`position`/`status`/`isActive` ajoutées ici (déjà
 * présentes côté `teamManager`, simplement absentes de ce mapping partiel).
 */
@Entity('Player')
export class Player {
  @PrimaryColumn({ type: 'varchar', length: 191 })
  id!: string

  @Column({ type: 'varchar', length: 191, name: 'firstNameFr' })
  firstNameFr!: string

  @Column({ type: 'varchar', length: 191, name: 'lastNameFr' })
  lastNameFr!: string

  @Column({ type: 'int' })
  number!: number

  @Column({ type: 'varchar', length: 191, name: 'teamId' })
  teamId!: string

  @Column({ type: 'varchar', length: 10, default: 'seniors' })
  category!: string

  @Column({
    type: 'enum',
    enum: ['TITULAR', 'SUBSTITUTE', 'BLANK', 'ENTERING', 'OUT_OF_LIST', 'SUSPENDED'],
    default: 'TITULAR',
  })
  status!: string

  @Column({ type: 'boolean', default: true, name: 'isActive' })
  isActive!: boolean

  @Column({ type: 'varchar', length: 50, nullable: true })
  position?: string | null
}
