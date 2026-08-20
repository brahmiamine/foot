import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

/** Pointage réel, écrit par Staff Hub. */
export type TrainingInvitationResponse = "PENDING" | "PRESENT" | "ABSENT" | "LATE" | "INJURED";
/** Intention de présence, écrite par Player Hub. */
export type TrainingRsvpStatus = "PENDING" | "ACCEPTED" | "DECLINED";

/**
 * `cms_training_invitations` (possédée par club-hub). Staff Hub écrit
 * response/respondedAt ; Player Hub écrit rsvpStatus/rsvpRespondedAt.
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
