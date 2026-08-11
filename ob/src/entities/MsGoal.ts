import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export type MatchPeriod = "H1" | "H2" | "ET1" | "ET2";

/**
 * Mappée sur `ms_goals` (table matchsheet, saisie en direct par l'arbitre/
 * délégué via la feuille de match électronique). Lecture seule.
 */
@Entity("ms_goals")
export class MsGoal {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "match_id", collation: "utf8mb4_uca1400_ai_ci" })
  matchId!: string;

  @Column({ type: "char", length: 36, name: "team_id", collation: "utf8mb4_uca1400_ai_ci" })
  teamId!: string;

  @Column({ type: "varchar", length: 191, nullable: true, name: "player_id" })
  playerId?: string | null;

  @Column({ type: "int" })
  minute!: number;

  @Column({ type: "enum", enum: ["H1", "H2", "ET1", "ET2"], default: "H1" })
  period!: MatchPeriod;

  @Column({ type: "tinyint", default: 0, name: "is_own_goal" })
  isOwnGoal!: boolean;

  @Column({ type: "tinyint", default: 0, name: "is_penalty" })
  isPenalty!: boolean;

  @Column({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
