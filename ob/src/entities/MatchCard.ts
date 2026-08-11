import { Entity, PrimaryColumn, Column } from "typeorm";
import type { MatchPeriod } from "./MsGoal";

export type CardType = "YELLOW" | "RED" | "DOUBLE_YELLOW";

/**
 * Mappée sur `Card` (table partagée avec matchsheet/arbinote/superadmin).
 * Lecture seule ici.
 */
@Entity("Card")
export class MatchCard {
  @PrimaryColumn({ type: "varchar", length: 191 })
  id!: string;

  @Column({ type: "varchar", length: 191 })
  playerId!: string;

  @Column({ type: "varchar", length: 191, name: "matchId", collation: "utf8mb4_uca1400_ai_ci" })
  matchId!: string;

  @Column({ type: "enum", enum: ["YELLOW", "RED", "DOUBLE_YELLOW"] })
  type!: CardType;

  @Column({ type: "int", nullable: true })
  minute?: number | null;

  @Column({ type: "enum", enum: ["H1", "H2", "ET1", "ET2"], nullable: true })
  period?: MatchPeriod | null;

  @Column({ type: "tinyint", default: 0 })
  isNeutralized!: boolean;

  @Column({ type: "datetime" })
  createdAt!: Date;
}
