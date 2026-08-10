import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Player } from "./Player";
import { Match } from "./Match";
import { FriendlyMatch } from "./FriendlyMatch";
import { User } from "./User";

export type StatMatchKind = "OFFICIAL" | "FRIENDLY";

/**
 * PlayerStat Entity — statistiques d'un joueur, saisies manuellement par le
 * staff ou importées en masse (CSV). Une ligne = une entrée, liée à un
 * match (officiel ou amical) si pertinent, ou à une saison (`season`) pour
 * une saisie/un import agrégé. Table propre à cette app, scopée par team_id.
 */
@Entity("cms_player_stats")
export class PlayerStat {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @ManyToOne(() => Player, { onDelete: "CASCADE" })
  @JoinColumn({ name: "player_id" })
  player!: Player;

  @Column({ type: "enum", enum: ["OFFICIAL", "FRIENDLY"], nullable: true, name: "match_type" })
  matchType?: StatMatchKind | null;

  @Column({ type: "char", length: 36, nullable: true, name: "match_id" })
  matchId?: string | null;

  @ManyToOne(() => Match, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "match_id" })
  match?: Match | null;

  @Column({ type: "bigint", nullable: true, name: "friendly_match_id" })
  friendlyMatchId?: number | null;

  @ManyToOne(() => FriendlyMatch, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "friendly_match_id" })
  friendlyMatch?: FriendlyMatch | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  season?: string | null;

  @Column({ type: "int", default: 0, name: "minutes_played" })
  minutesPlayed!: number;

  @Column({ type: "int", default: 0 })
  goals!: number;

  @Column({ type: "int", default: 0 })
  assists!: number;

  @Column({ type: "int", default: 0, name: "yellow_cards" })
  yellowCards!: number;

  @Column({ type: "int", default: 0, name: "red_cards" })
  redCards!: number;

  @Column({ type: "int", default: 0, name: "injuries_count" })
  injuriesCount!: number;

  @Column({ type: "int", default: 0, name: "trainings_attended" })
  trainingsAttended!: number;

  @Column({ type: "int", default: 0, name: "trainings_total" })
  trainingsTotal!: number;

  @Column({ type: "varchar", length: 500, nullable: true })
  notes?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "created_by" })
  createdBy?: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "created_by" })
  creator?: User | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", nullable: true, name: "updated_at" })
  updatedAt?: Date | null;
}
