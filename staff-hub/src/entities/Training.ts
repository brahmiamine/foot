import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type TrainingType = "TECHNIQUE" | "PHYSIQUE" | "TACTIQUE" | "PREPARATION_MATCH" | "RECUPERATION" | "AUTRE";
export type TrainingStatus = "SCHEDULED" | "DONE" | "CANCELLED";
export type TrainingIntensity = "LOW" | "MEDIUM" | "HIGH";
/** STAFF-003 — DRAFT/SUBMITTED tant que la policy club l'exige, sinon toujours APPROVED. */
export type TrainingPlanStatus = "DRAFT" | "SUBMITTED" | "APPROVED";

/** `cms_trainings` (possédée par club-hub) — voir club-hub/src/entities/Training.ts. Lecture seule. */
@Entity("cms_trainings")
export class Training {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 10, default: "seniors" })
  category!: string;

  @Column({ type: "varchar", length: 200 })
  title!: string;

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

  @Column({ type: "int", nullable: true, name: "duration_minutes" })
  durationMinutes?: number | null;

  @Column({ type: "varchar", length: 200, nullable: true, name: "venue_name" })
  venueName?: string | null;

  @Column({ type: "enum", enum: ["SCHEDULED", "DONE", "CANCELLED"], default: "SCHEDULED" })
  status!: TrainingStatus;

  @Column({ type: "enum", enum: ["DRAFT", "SUBMITTED", "APPROVED"], default: "APPROVED", name: "plan_status" })
  planStatus!: TrainingPlanStatus;

  @Column({ type: "varchar", length: 191, nullable: true, name: "submitted_by" })
  submittedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "submitted_at" })
  submittedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "approved_by" })
  approvedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "approved_at" })
  approvedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
