import { Column, Entity, PrimaryColumn } from 'typeorm'

/**
 * Mappée sur `Player` (table teamManager, référentiel effectif club).
 * Essentiellement en lecture seule ici (fil des faits de match, liste des
 * joueurs par club) — seule exception : le module transferts
 * (lib/adminPlayerTransfers.ts) écrit `teamId`, sur le même modèle que le
 * double-écrivain déjà documenté pour `Card` (teamManager + matchsheet,
 * voir db/OWNERSHIP.md) : jamais une autre colonne, jamais en dehors de ce
 * module.
 */
@Entity('Player')
export class Player {
  @PrimaryColumn({ type: 'varchar', length: 191 })
  id!: string

  @Column({ type: 'varchar', length: 191, name: 'firstNameFr' })
  firstNameFr!: string
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'firstNameAr' })
  firstNameAr?: string | null

  @Column({ type: 'varchar', length: 191, name: 'lastNameFr' })
  lastNameFr!: string
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'lastNameAr' })
  lastNameAr?: string | null

  @Column({ type: 'int' })
  number!: number

  @Column({ type: 'varchar', length: 191, name: 'teamId' })
  teamId!: string

  @Column({ type: 'varchar', length: 10, default: 'seniors' })
  category!: string

  @Column({ type: 'boolean', default: true, name: 'isActive' })
  isActive!: boolean

  /** GOALKEEPER | DEFENDER | MIDFIELDER | FORWARD */
  @Column({ type: 'varchar', length: 50, nullable: true })
  position?: string | null

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'imageUrl' })
  imageUrl?: string | null
}
