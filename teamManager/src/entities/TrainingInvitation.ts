import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Training } from "./Training";
import { Player } from "./Player";

export type TrainingInvitationResponse = "PENDING" | "PRESENT" | "ABSENT";

/**
 * TrainingInvitation Entity — joueur invité à une séance d'entraînement,
 * avec suivi de sa réponse (présent / absent), même logique que Convocation
 * pour les matchs.
 */
@Entity("cms_training_invitations")
export class TrainingInvitation {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "training_id" })
  trainingId!: number;

  @ManyToOne(() => Training, { onDelete: "CASCADE" })
  @JoinColumn({ name: "training_id" })
  training!: Training;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @ManyToOne(() => Player, { onDelete: "CASCADE" })
  @JoinColumn({ name: "player_id" })
  player!: Player;

  @Column({ type: "enum", enum: ["PENDING", "PRESENT", "ABSENT"], default: "PENDING" })
  response!: TrainingInvitationResponse;

  @Column({ type: "datetime", nullable: true, name: "notified_at" })
  notifiedAt?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "responded_at" })
  respondedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
