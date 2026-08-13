import { Column, Entity, PrimaryColumn } from 'typeorm'

/**
 * Mappée sur `Player` (table teamManager, référentiel effectif club).
 * Lecture seule ici — utilisée pour afficher les noms de joueurs dans le
 * fil des faits de match (buts/cartons/blessures/remplacements).
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
}
