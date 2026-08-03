import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Sheet } from "./Sheet";
import { Match } from "./Match";
import { Team } from "./Team";
import { Player } from "./Player";
import type { MatchPeriod } from "./Card";

/**
 * Substitution Entity — changement de joueur pendant le match.
 */
@Entity("ms_substitutions")
export class Substitution {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "sheet_id" })
  sheetId!: number;

  @ManyToOne(() => Sheet, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sheet_id" })
  sheet!: Sheet;

  @Column({ type: "char", length: 36, name: "match_id" })
  matchId!: string;

  @ManyToOne(() => Match, { onDelete: "CASCADE" })
  @JoinColumn({ name: "match_id" })
  match!: Match;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 191, name: "player_out_id" })
  playerOutId!: string;

  @ManyToOne(() => Player, { onDelete: "CASCADE" })
  @JoinColumn({ name: "player_out_id" })
  playerOut!: Player;

  @Column({ type: "varchar", length: 191, name: "player_in_id" })
  playerInId!: string;

  @ManyToOne(() => Player, { onDelete: "CASCADE" })
  @JoinColumn({ name: "player_in_id" })
  playerIn!: Player;

  @Column({ type: "int" })
  minute!: number;

  @Column({ type: "enum", enum: ["H1", "H2", "ET1", "ET2"], default: "H1" })
  period!: MatchPeriod;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
