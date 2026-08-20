import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";
import type { AgeCategory } from "@/types/categories";
import type { TrainingBlockInput } from "@/types/trainings";
import type { TrainingIntensity, TrainingType } from "./Training";

/** Modèle de séance réutilisable, strictement scopé par club. */
@Entity("cms_training_templates")
@Index("idx_training_templates_team_category", ["teamId", "category"])
export class TrainingTemplate {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 10, default: "seniors" })
  category!: AgeCategory;

  @Column({ type: "varchar", length: 120 })
  name!: string;

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

  @Column({ type: "int", nullable: true, name: "duration_minutes" })
  durationMinutes?: number | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  equipment?: string | null;

  @Column({ type: "varchar", length: 200, nullable: true, name: "venue_name" })
  venueName?: string | null;

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  /** Décalage entre date de séance et deadline RSVP. */
  @Column({ type: "int", default: 1440, name: "response_deadline_offset_minutes" })
  responseDeadlineOffsetMinutes!: number;

  @Column({ type: "int", default: 1440, name: "reminder_offset_minutes" })
  reminderOffsetMinutes!: number;

  @Column({ type: "simple-json", name: "blocks_json" })
  blocks!: TrainingBlockInput[];

  @Column({ type: "varchar", length: 191, nullable: true, name: "created_by" })
  createdBy?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
