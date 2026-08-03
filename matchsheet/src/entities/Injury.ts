import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Sheet } from "./Sheet";
import { Match } from "./Match";
import { Team } from "./Team";
import { Player } from "./Player";
import { MatchPeriod } from "./Card";

/**
 * Injury Entity — blessure constatée pendant le match.
 */
@Entity("ms_injuries")
export class Injury {
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

  @Column({ type: "varchar", length: 191, nullable: true, name: "player_id" })
  playerId?: string | null;

  @ManyToOne(() => Player, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "player_id" })
  player?: Player | null;

  @Column({ type: "int", nullable: true })
  minute?: number | null;

  @Column({ type: "enum", enum: ["H1", "H2", "ET1", "ET2"], nullable: true })
  period?: MatchPeriod | null;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ type: "tinyint", default: 0, name: "requires_substitution" })
  requiresSubstitution!: boolean;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
