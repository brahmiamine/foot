import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";
import type { ApplicationStatus } from "./PlayerApplication";

/**
 * RecruitmentApplication Entity — candidature soumise via le formulaire
 * public /recrutement (détection/recrutement, jeunes et seniors).
 */
@Entity("cms_recruitment_applications")
export class RecruitmentApplication {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 150 })
  name!: string;

  @Column({ type: "date", name: "birth_date" })
  birthDate!: string;

  @Column({ type: "varchar", length: 20 })
  category!: string;

  @Column({ type: "varchar", length: 50 })
  position!: string;

  @Column({ type: "varchar", length: 150, nullable: true, name: "current_club" })
  currentClub?: string | null;

  @Column({ type: "varchar", length: 30, name: "parent_phone" })
  parentPhone!: string;

  @Column({ type: "varchar", length: 190, nullable: true })
  email?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "video_url" })
  videoUrl?: string | null;

  @Column({ type: "text", nullable: true })
  message?: string | null;

  @Column({ type: "enum", enum: ["NEW", "CONTACTED", "TRIAL", "ACCEPTED", "REJECTED"], default: "NEW" })
  status!: ApplicationStatus;

  @Column({ type: "text", nullable: true, name: "admin_notes" })
  adminNotes?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at", nullable: true })
  updatedAt?: Date | null;
}
