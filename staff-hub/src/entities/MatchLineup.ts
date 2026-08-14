import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type LineupRole = "STARTER" | "SUBSTITUTE";
export type LineupMatchKind = "OFFICIAL" | "FRIENDLY";

/** `cms_match_lineups` (possédée par club-hub) — voir club-hub/src/entities/MatchLineup.ts. */
@Entity("cms_match_lineups")
export class MatchLineup {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "char", length: 36, nullable: true, name: "match_id" })
  matchId?: string | null;

  @Column({ type: "enum", enum: ["OFFICIAL", "FRIENDLY"], default: "OFFICIAL", name: "match_type" })
  matchType!: LineupMatchKind;

  @Column({ type: "bigint", nullable: true, name: "friendly_match_id" })
  friendlyMatchId?: number | null;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @Column({ type: "enum", enum: ["STARTER", "SUBSTITUTE"], default: "STARTER" })
  role!: LineupRole;

  @Column({ type: "int", nullable: true, name: "shirt_number" })
  shirtNumber?: number | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  position?: string | null;

  @Column({ type: "tinyint", default: 0, name: "is_captain" })
  isCaptain!: boolean;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
