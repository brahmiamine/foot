import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";

export type RecruitmentApplicationStatus =
  | "NEW"
  | "SCOUT_APPROVED"
  | "COACH_APPROVED"
  | "TRIAL_SCHEDULED"
  | "TRIAL_APPROVED"
  | "SPORTING_DIRECTOR_APPROVED"
  | "NEGOTIATION"
  | "ACCEPTED"
  | "REJECTED";

/**
 * RecruitmentApplication Entity — candidature soumise via le formulaire
 * public /recrutement (détection/recrutement, jeunes et seniors).
 *
 * CLUB-007 sépare explicitement son workflow de celui des candidatures
 * académie : scout -> coach -> essai -> directeur sportif -> négociation.
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

  @Column({
    type: "enum",
    enum: [
      "NEW",
      "SCOUT_APPROVED",
      "COACH_APPROVED",
      "TRIAL_SCHEDULED",
      "TRIAL_APPROVED",
      "SPORTING_DIRECTOR_APPROVED",
      "NEGOTIATION",
      "ACCEPTED",
      "REJECTED",
    ],
    default: "NEW",
  })
  status!: RecruitmentApplicationStatus;

  @Column({ type: "text", nullable: true, name: "admin_notes" })
  adminNotes?: string | null;

  @Column({ type: "datetime", nullable: true, name: "scout_reviewed_at" })
  scoutReviewedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "scout_reviewed_by" })
  scoutReviewedBy?: string | null;

  @Column({ type: "text", nullable: true, name: "scout_notes" })
  scoutNotes?: string | null;

  @Column({ type: "datetime", nullable: true, name: "coach_reviewed_at" })
  coachReviewedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "coach_reviewed_by" })
  coachReviewedBy?: string | null;

  @Column({ type: "text", nullable: true, name: "coach_notes" })
  coachNotes?: string | null;

  @Column({ type: "datetime", nullable: true, name: "trial_scheduled_at" })
  trialScheduledAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "trial_location" })
  trialLocation?: string | null;

  @Column({ type: "text", nullable: true, name: "trial_notes" })
  trialNotes?: string | null;

  @Column({ type: "datetime", nullable: true, name: "trial_approved_at" })
  trialApprovedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "trial_approved_by" })
  trialApprovedBy?: string | null;

  @Column({ type: "text", nullable: true, name: "trial_evaluation" })
  trialEvaluation?: string | null;

  @Column({ type: "datetime", nullable: true, name: "sporting_director_approved_at" })
  sportingDirectorApprovedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "sporting_director_approved_by" })
  sportingDirectorApprovedBy?: string | null;

  @Column({ type: "text", nullable: true, name: "sporting_director_notes" })
  sportingDirectorNotes?: string | null;

  @Column({ type: "datetime", nullable: true, name: "negotiation_started_at" })
  negotiationStartedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "negotiation_started_by" })
  negotiationStartedBy?: string | null;

  @Column({ type: "text", nullable: true, name: "negotiation_notes" })
  negotiationNotes?: string | null;

  @Column({ type: "datetime", nullable: true, name: "accepted_at" })
  acceptedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "accepted_by" })
  acceptedBy?: string | null;

  @Column({ type: "text", nullable: true, name: "acceptance_notes" })
  acceptanceNotes?: string | null;

  @Column({ type: "datetime", nullable: true, name: "rejected_at" })
  rejectedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "rejected_by" })
  rejectedBy?: string | null;

  @Column({ type: "text", nullable: true, name: "rejection_reason" })
  rejectionReason?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at", nullable: true })
  updatedAt?: Date | null;
}
