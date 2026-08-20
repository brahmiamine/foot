import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

/** Pointage réel saisi par le staff après/pendant la séance. */
export type TrainingInvitationResponse = "PENDING" | "PRESENT" | "ABSENT" | "LATE" | "INJURED";
/** Intention de présence saisie par le joueur avant la deadline. */
export type TrainingRsvpStatus = "PENDING" | "ACCEPTED" | "DECLINED";

/**
 * `cms_training_invitations` (possédée par club-hub) — voir
 * club-hub/src/entities/TrainingInvitation.ts. player-hub écrit uniquement
 * rsvpStatus/rsvpRespondedAt pour le joueur connecté ; `response` reste le
 * pointage de présence détenu par le staff.
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
