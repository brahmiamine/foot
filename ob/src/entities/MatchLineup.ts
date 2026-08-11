import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export type LineupRole = "STARTER" | "SUBSTITUTE";

/** Mappée sur `cms_match_lineups` (table teamManager). Lecture seule. */
@Entity("cms_match_lineups")
export class MatchLineup {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id", collation: "utf8mb4_uca1400_ai_ci" })
  teamId!: string;

  @Column({ type: "char", length: 36, nullable: true, name: "match_id", collation: "utf8mb4_uca1400_ai_ci" })
  matchId?: string | null;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @Column({ type: "enum", enum: ["STARTER", "SUBSTITUTE"], default: "STARTER" })
  role!: LineupRole;

  @Column({ type: "tinyint", default: 0, name: "is_captain" })
  isCaptain!: boolean;
}
