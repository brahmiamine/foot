import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Stadium } from "./Stadium";
import { User } from "./User";
import type { AgeCategory } from "@/types/categories";

export type TrainingType = "TECHNIQUE" | "PHYSIQUE" | "TACTIQUE" | "PREPARATION_MATCH" | "RECUPERATION" | "AUTRE";
export type TrainingStatus = "SCHEDULED" | "DONE" | "CANCELLED";
export type TrainingIntensity = "LOW" | "MEDIUM" | "HIGH";

/**
 * Training Entity — séance d'entraînement d'une catégorie du club, avec
 * terrain et joueurs invités (cms_training_invitations). Table propre à
 * cette app, scopée par team_id.
 */
@Entity("cms_trainings")
export class Training {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 10, default: "seniors" })
  category!: AgeCategory;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  objective?: string | null;

  @Column({
    type: "enum",
    enum: ["TECHNIQUE", "PHYSIQUE", "TACTIQUE", "PREPARATION_MATCH", "RECUPERATION", "AUTRE"],
    default: "AUTRE",
    name: "training_type",
  })
  trainingType!: TrainingType;

  @Column({ type: "enum", enum: ["LOW", "MEDIUM", "HIGH"], nullable: true })
  intensity?: TrainingIntensity | null;

  @Column({ type: "datetime" })
  date!: Date;

  /** Dernier instant auquel le joueur peut modifier son RSVP. */
  @Column({ type: "datetime", nullable: true, name: "response_deadline" })
  responseDeadline?: Date | null;

  /** Une fois verrouillé, le roster d'invitations ne peut plus changer. */
  @Column({ type: "tinyint", default: 0, name: "invitations_locked" })
  invitationsLocked!: boolean;

  @Column({ type: "datetime", nullable: true, name: "invitations_locked_at" })
  invitationsLockedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "invitations_locked_by" })
  invitationsLockedBy?: string | null;

  /** Délai du rappel avant la deadline, en minutes. */
  @Column({ type: "int", default: 1440, name: "reminder_offset_minutes" })
  reminderOffsetMinutes!: number;

  @Column({ type: "int", nullable: true, name: "duration_minutes" })
  durationMinutes?: number | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  equipment?: string | null;

  @Column({ type: "bigint", nullable: true, name: "stadium_id" })
  stadiumId?: number | null;

  @ManyToOne(() => Stadium, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "stadium_id" })
  stadium?: Stadium | null;

  @Column({ type: "varchar", length: 200, nullable: true, name: "venue_name" })
  venueName?: string | null;

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  @Column({ type: "enum", enum: ["SCHEDULED", "DONE", "CANCELLED"], default: "SCHEDULED" })
  status!: TrainingStatus;

  @Column({ type: "varchar", length: 191, nullable: true, name: "created_by" })
  createdBy?: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "created_by" })
  creator?: User | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", nullable: true, name: "updated_at" })
  updatedAt?: Date | null;
}
