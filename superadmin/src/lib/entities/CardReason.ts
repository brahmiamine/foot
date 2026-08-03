import { Column, Entity, PrimaryColumn, CreateDateColumn } from 'typeorm'

export type CardReasonType = 'YELLOW' | 'RED' | 'BOTH'

/**
 * CardReason Entity — mappée sur la table `CardReason`, partagée avec
 * cardManager/teamManager (motifs de carton, communs à tous les clubs).
 * Gérée depuis superadmin car ce référentiel est global, pas propre à un club.
 */
@Entity({ name: 'CardReason' })
export class CardReason {
  @PrimaryColumn({ type: 'varchar', length: 191 })
  id!: string

  @Column({ type: 'varchar', length: 191 })
  labelFr!: string

  @Column({ type: 'varchar', length: 191, nullable: true })
  labelAr?: string | null

  @Column({ type: 'enum', enum: ['YELLOW', 'RED', 'BOTH'], default: 'BOTH' })
  type!: CardReasonType

  @Column({ type: 'tinyint', default: 1 })
  isActive!: boolean

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt!: Date
}
