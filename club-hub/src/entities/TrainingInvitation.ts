import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Training } from "./Training";
import { Player } from "./Player";

/** Pointage réel de la séance, détenu par le staff. */
export type TrainingInvitationResponse = "PENDING" | "PRESENT" | "ABSENT" | "LATE" | "INJURED";
/** Réponse du joueur avant séance. */
export type TrainingRsvpStatus = "PENDING" | "ACCEPTED" | "DECLINED";

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

  @Column({ type: "enum", enum: ["PENDING", "PRESENT", "ABSENT", "LATE", "INJURED"], default: "PENDING" })
  response!: TrainingInvitationResponse;

  @Column({ type: "datetime", nullable: true, name: "notified_at" })
  notifiedAt?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "responded_at" })
  respondedAt?: Date | null;

  @Column({
    type: "enum",
    enum: ["PENDING", "ACCEPTED", "DECLINED"],
    default: "PENDING",
    name: "rsvp_status",
  })
  rsvpStatus!: TrainingRsvpStatus;

  @Column({ type: "datetime", nullable: true, name: "rsvp_responded_at" })
  rsvpRespondedAt?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "reminder_sent_at" })
  reminderSentAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
