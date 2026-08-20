import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";

export type SponsorLogoSize = "SMALL" | "MEDIUM" | "LARGE";
export type SponsorLevel = "OR" | "ARGENT" | "BRONZE" | "LOCAL";
export type SponsorRequestStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "NEGOTIATION"
  | "CONTRACT_DRAFT"
  | "APPROVAL_PENDING"
  | "APPROVED"
  | "ACTIVE"
  | "EXPIRED"
  | "REFUSED";

/** Demande publique de partenariat, pilotée par le workflow CLUB-008. */
@Entity("cms_sponsor_requests")
export class SponsorRequest {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 200, name: "company_name" })
  companyName!: string;

  @Column({ type: "varchar", length: 150, name: "contact_name" })
  contactName!: string;

  @Column({ type: "varchar", length: 190 })
  email!: string;

  @Column({ type: "varchar", length: 30, nullable: true })
  phone?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  website?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "logo_url" })
  logoUrl?: string | null;

  @Column({ type: "enum", enum: ["SMALL", "MEDIUM", "LARGE"], nullable: true, name: "logo_size" })
  logoSize?: SponsorLogoSize | null;

  @Column({ type: "enum", enum: ["OR", "ARGENT", "BRONZE", "LOCAL"], nullable: true, name: "proposed_level" })
  proposedLevel?: SponsorLevel | null;

  @Column({ type: "text", nullable: true })
  message?: string | null;

  @Column({
    type: "enum",
    enum: [
      "PENDING",
      "UNDER_REVIEW",
      "NEGOTIATION",
      "CONTRACT_DRAFT",
      "APPROVAL_PENDING",
      "APPROVED",
      "ACTIVE",
      "EXPIRED",
      "REFUSED",
    ],
    default: "PENDING",
  })
  status!: SponsorRequestStatus;

  @Column({ type: "text", nullable: true, name: "admin_notes" })
  adminNotes?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "reviewed_by" })
  reviewedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "reviewed_at" })
  reviewedAt?: Date | null;

  @Column({ type: "text", nullable: true, name: "negotiation_notes" })
  negotiationNotes?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "negotiation_started_by" })
  negotiationStartedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "negotiation_started_at" })
  negotiationStartedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "refused_by" })
  refusedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "refused_at" })
  refusedAt?: Date | null;

  @Column({ type: "text", nullable: true, name: "refusal_reason" })
  refusalReason?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
