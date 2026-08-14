import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { Player } from './Player'
import { Match } from './Match'

export type CardType = 'YELLOW' | 'RED' | 'DOUBLE_YELLOW'
export type MatchPeriod = 'H1' | 'H2' | 'ET1' | 'ET2'

/**
 * Mappée sur `Card`, table partagée avec club-hub/match-operations (système
 * disciplinaire, voir db/OWNERSHIP.md). Lecture seule ici — utilisée pour
 * le fil des faits de match.
 */
@Entity('Card')
export class Card {
  @PrimaryColumn({ type: 'varchar', length: 191 })
  id!: string

  @Column({ type: 'varchar', length: 191 })
  playerId!: string

  @ManyToOne(() => Player)
  @JoinColumn({ name: 'playerId' })
  player?: Player

  @Column({ type: 'varchar', length: 191 })
  matchId!: string

  @ManyToOne(() => Match)
  @JoinColumn({ name: 'matchId' })
  match?: Match

  @Column({ type: 'enum', enum: ['YELLOW', 'RED', 'DOUBLE_YELLOW'] })
  type!: CardType

  @Column({ type: 'int', nullable: true })
  minute?: number | null

  @Column({ type: 'enum', enum: ['H1', 'H2', 'ET1', 'ET2'], nullable: true })
  period?: MatchPeriod | null

  /** Neutralisé par un double jaune ou la règle du cumul — n'est plus comptabilisé, mais reste un fait de match. */
  @Column({ type: 'tinyint', default: 0 })
  isNeutralized!: boolean
}
