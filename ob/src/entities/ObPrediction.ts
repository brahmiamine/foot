import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("ob_predictions")
export class ObPrediction {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  /** Collation alignée sur `matches.id` (utf8mb4_uca1400_ai_ci) pour permettre les jointures SQL. */
  @Column({ type: "char", length: 36, name: "match_id", collation: "utf8mb4_uca1400_ai_ci" })
  matchId!: string;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "int", name: "score_home" })
  scoreHome!: number;

  @Column({ type: "int", name: "score_away" })
  scoreAway!: number;

  @Column({ type: "int", nullable: true, name: "points_awarded" })
  pointsAwarded?: number | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
