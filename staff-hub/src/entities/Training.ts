import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type TrainingType = "TECHNIQUE" | "PHYSIQUE" | "TACTIQUE" | "PREPARATION_MATCH" | "RECUPERATION" | "AUTRE";
export type TrainingStatus = "SCHEDULED" | "DONE" | "CANCELLED";
export type TrainingIntensity = "LOW" | "MEDIUM" | "HIGH";

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

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
