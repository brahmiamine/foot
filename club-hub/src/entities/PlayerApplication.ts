import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";

export type ApplicationStatus =
  | "NEW"
  | "PRE_SCREENED"
  | "TRIAL_SCHEDULED"
  | "TECHNICAL_APPROVED"
  | "ADMIN_APPROVED"
  | "PLAYER_CREATED"
  | "REJECTED";

/**
 * PlayerApplication Entity — candidature "Inscrire mon enfant" soumise via
 * le formulaire public /inscription. Le traitement administratif suit un
 * workflow serveur strict : pré-sélection, essai, validation technique,
 * validation administrative puis création contrôlée du Player.
 */
@Entity("cms_player_applications")
export class PlayerApplication {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 100, name: "child_last_name" })
  childLastName!: string;

  @Column({ type: "varchar", length: 100, name: "child_first_name" })
  childFirstName!: string;

  @Column({ type: "date", name: "birth_date" })
  birthDate!: string;

  @Column({ type: "varchar", length: 20 })
  category!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  position?: string | null;

  @Column({ type: "varchar", length: 150, name: "parent_name" })
  parentName!: string;

  @Column({ type: "varchar", length: 30, name: "parent_phone" })
  parentPhone!: string;

  @Column({ type: "varchar", length: 190, name: "parent_email" })
  parentEmail!: string;

  @Column({ type: "text", nullable: true })
  message?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "document_url" })
  documentUrl?: string | null;

  @Column({
    type: "enum",
    enum: [
      "NEW",
      "PRE_SCREENED",
      "TRIAL_SCHEDULED",
      "TECHNICAL_APPROVED",
      "ADMIN_APPROVED",
      "PLAYER_CREATED",
      "REJECTED",
    ],
    default: "NEW",
  })
  status!: ApplicationStatus;

  @Column({ type: "text", nullable: true, name: "admin_notes" })
  adminNotes?: string | null;

  @Column({ type: "text", nullable: true, name: "pre_screening_notes" })
  preScreeningNotes?: string | null;

  @Column({ type: "datetime", nullable: true, name: "pre_screened_at" })
  preScreenedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "pre_screened_by" })
  preScreenedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "trial_scheduled_at" })
  trialScheduledAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "trial_location" })
  trialLocation?: string | null;

  @Column({ type: "text", nullable: true, name: "trial_notes" })
  trialNotes?: string | null;

  @Column({ type: "datetime", nullable: true, name: "technical_approved_at" })
  technicalApprovedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "technical_approved_by" })
  technicalApprovedBy?: string | null;

  @Column({ type: "text", nullable: true, name: "technical_notes" })
  technicalNotes?: string | null;

  @Column({ type: "datetime", nullable: true, name: "administrative_approved_at" })
  administrativeApprovedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "administrative_approved_by" })
  administrativeApprovedBy?: string | null;

  @Column({ type: "text", nullable: true, name: "administrative_notes" })
  administrativeNotes?: string | null;

  @Column({ type: "datetime", nullable: true, name: "rejected_at" })
  rejectedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "rejected_by" })
  rejectedBy?: string | null;

  @Column({ type: "text", nullable: true, name: "rejection_reason" })
  rejectionReason?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "player_id" })
  playerId?: string | null;

  @Column({ type: "datetime", nullable: true, name: "player_created_at" })
  playerCreatedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "player_created_by" })
  playerCreatedBy?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at", nullable: true })
  updatedAt?: Date | null;
}
