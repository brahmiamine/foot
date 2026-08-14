import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Match } from "./Match";
import { Team } from "./Team";
import { Player } from "./Player";
import type { MatchPeriod } from "./Card";

/**
 * Mappée sur `ms_substitutions`, table possédée par `match-operations` (voir
 * db/OWNERSHIP.md). Lecture seule ici — fil des faits de match.
 */
@Entity("ms_substitutions")
export class Substitution {
  @PrimaryColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "match_id" })
  matchId!: string;

  @ManyToOne(() => Match)
  @JoinColumn({ name: "match_id" })
  match?: Match;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team)
  @JoinColumn({ name: "team_id" })
  team?: Team;

  @Column({ type: "varchar", length: 191, name: "player_out_id" })
  playerOutId!: string;

  @ManyToOne(() => Player)
  @JoinColumn({ name: "player_out_id" })
  playerOut?: Player;

  @Column({ type: "varchar", length: 191, name: "player_in_id" })
  playerInId!: string;

  @ManyToOne(() => Player)
  @JoinColumn({ name: "player_in_id" })
  playerIn?: Player;

  @Column({ type: "int" })
  minute!: number;

  @Column({ type: "enum", enum: ["H1", "H2", "ET1", "ET2"], default: "H1" })
  period!: MatchPeriod;

  /** Annulation sans suppression côté match-operations — exclu du fil par défaut. */
  @Column({ type: "datetime", nullable: true, name: "cancelled_at" })
  cancelledAt?: Date | null;
}
