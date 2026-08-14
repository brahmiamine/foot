import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Match } from "./Match";
import { Team } from "./Team";
import { Player } from "./Player";
import type { MatchPeriod } from "./Card";

/** Mappée sur `ms_injuries`, table possédée par match-operations. Lecture seule. */
@Entity("ms_injuries")
export class Injury {
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

  @Column({ type: "varchar", length: 191, nullable: true, name: "player_id" })
  playerId?: string | null;

  @ManyToOne(() => Player, { nullable: true })
  @JoinColumn({ name: "player_id" })
  player?: Player | null;

  @Column({ type: "int", nullable: true })
  minute?: number | null;

  @Column({ type: "enum", enum: ["H1", "H2", "ET1", "ET2"], nullable: true })
  period?: MatchPeriod | null;
}
