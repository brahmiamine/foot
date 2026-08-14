import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { Match } from './Match'
import { Team } from './Team'
import { Player } from './Player'
import type { MatchPeriod } from './Card'

/**
 * Mappée sur `ms_goals`, table possédée par `match-operations` (voir
 * db/OWNERSHIP.md). Lecture seule — fil des faits de match.
 */
@Entity('ms_goals')
export class Goal {
  @PrimaryColumn({ type: 'bigint' })
  id!: number

  @Column({ type: 'char', length: 36, name: 'match_id' })
  matchId!: string

  @ManyToOne(() => Match)
  @JoinColumn({ name: 'match_id' })
  match?: Match

  @Column({ type: 'char', length: 36, name: 'team_id' })
  teamId!: string

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'team_id' })
  team?: Team

  @Column({ type: 'varchar', length: 191, nullable: true, name: 'player_id' })
  playerId?: string | null

  @ManyToOne(() => Player, { nullable: true })
  @JoinColumn({ name: 'player_id' })
  player?: Player | null

  @Column({ type: 'int' })
  minute!: number

  @Column({ type: 'enum', enum: ['H1', 'H2', 'ET1', 'ET2'], default: 'H1' })
  period!: MatchPeriod

  @Column({ type: 'tinyint', default: 0, name: 'is_own_goal' })
  isOwnGoal!: boolean

  @Column({ type: 'tinyint', default: 0, name: 'is_penalty' })
  isPenalty!: boolean

  /** Annulation sans suppression côté match-operations — exclu du fil par défaut. */
  @Column({ type: 'datetime', nullable: true, name: 'cancelled_at' })
  cancelledAt?: Date | null
}
