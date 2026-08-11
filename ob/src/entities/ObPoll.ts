import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type ObPollType = "POLL" | "MOTM" | "PLAYER_OF_MONTH" | "GOAL_OF_MONTH";

/** Sert les sondages libres (#13) et les votes à thème (#18) selon `type`. */
@Entity("ob_polls")
export class ObPoll {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "varchar", length: 255 })
  question!: string;

  @Column({ type: "enum", enum: ["POLL", "MOTM", "PLAYER_OF_MONTH", "GOAL_OF_MONTH"], default: "POLL" })
  type!: ObPollType;

  /** Collation alignée sur `matches.id` (utf8mb4_uca1400_ai_ci) pour permettre les jointures SQL. */
  @Column({ type: "char", length: 36, nullable: true, name: "match_id", collation: "utf8mb4_uca1400_ai_ci" })
  matchId?: string | null;

  @Column({ type: "enum", enum: ["OPEN", "CLOSED"], default: "OPEN" })
  status!: "OPEN" | "CLOSED";

  @Column({ type: "varchar", length: 191, nullable: true, name: "created_by" })
  createdBy?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @Column({ type: "datetime", nullable: true, name: "closes_at" })
  closesAt?: Date | null;
}
