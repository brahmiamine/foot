import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type TrainingInvitationResponse = "PENDING" | "PRESENT" | "ABSENT" | "LATE" | "INJURED";

/**
 * `cms_training_invitations` (possédée par club-hub) — voir
 * club-hub/src/entities/TrainingInvitation.ts. player-hub écrit uniquement
 * response/respondedAt pour le joueur connecté.
 */
@Entity("cms_training_invitations")
export class TrainingInvitation {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "training_id" })
  trainingId!: number;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @Column({ type: "enum", enum: ["PENDING", "PRESENT", "ABSENT", "LATE", "INJURED"], default: "PENDING" })
  response!: TrainingInvitationResponse;

  @Column({ type: "datetime", nullable: true, name: "notified_at" })
  notifiedAt?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "responded_at" })
  respondedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
