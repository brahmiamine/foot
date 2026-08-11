import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import type { MatchPeriod } from "./MsGoal";

/** Mappée sur `ms_substitutions` (table matchsheet). Lecture seule. */
@Entity("ms_substitutions")
export class MsSubstitution {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "match_id", collation: "utf8mb4_uca1400_ai_ci" })
  matchId!: string;

  @Column({ type: "char", length: 36, name: "team_id", collation: "utf8mb4_uca1400_ai_ci" })
  teamId!: string;

  @Column({ type: "varchar", length: 191, name: "player_out_id" })
  playerOutId!: string;

  @Column({ type: "varchar", length: 191, name: "player_in_id" })
  playerInId!: string;

  @Column({ type: "int" })
  minute!: number;

  @Column({ type: "enum", enum: ["H1", "H2", "ET1", "ET2"], default: "H1" })
  period!: MatchPeriod;

  @Column({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
