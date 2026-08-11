import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Match } from "./Match";
import { Team } from "./Team";
import { Player } from "./Player";
import type { MatchPeriod } from "./Card";

/**
 * Mappée sur `ms_goals`, table possédée par matchsheet (§5.1 manquants.md :
 * la feuille de match est source de vérité du live). Lecture seule ici, pour
 * le fil d'événements en direct de la page d'accueil.
 */
@Entity("ms_goals")
export class Goal {
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

  @Column({ type: "int" })
  minute!: number;

  @Column({ type: "enum", enum: ["H1", "H2", "ET1", "ET2"], default: "H1" })
  period!: MatchPeriod;

  @Column({ type: "tinyint", default: 0, name: "is_own_goal" })
  isOwnGoal!: boolean;

  @Column({ type: "tinyint", default: 0, name: "is_penalty" })
  isPenalty!: boolean;
}
