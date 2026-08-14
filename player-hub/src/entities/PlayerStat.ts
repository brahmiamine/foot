import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type StatMatchKind = "OFFICIAL" | "FRIENDLY";

/** `cms_player_stats` (possédée par club-hub), lecture seule — voir club-hub/src/entities/PlayerStat.ts. */
@Entity("cms_player_stats")
export class PlayerStat {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @Column({ type: "enum", enum: ["OFFICIAL", "FRIENDLY"], nullable: true, name: "match_type" })
  matchType?: StatMatchKind | null;

  @Column({ type: "char", length: 36, nullable: true, name: "match_id" })
  matchId?: string | null;

  @Column({ type: "bigint", nullable: true, name: "friendly_match_id" })
  friendlyMatchId?: number | null;

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

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
