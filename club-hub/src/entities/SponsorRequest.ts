import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";

export type SponsorLogoSize = "SMALL" | "MEDIUM" | "LARGE";
export type SponsorLevel = "OR" | "ARGENT" | "BRONZE" | "LOCAL";
export type SponsorRequestStatus = "PENDING" | "ACCEPTED" | "REFUSED";

/**
 * SponsorRequest Entity — demande de partenariat soumise via le formulaire
 * public par une entreprise souhaitant devenir sponsor du club. Traitée
 * ensuite dans club-hub (accepter → crée un Sponsor, ou refuser).
 * Table propre à cette app, scopée par team_id.
 */
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

  @Column({ type: "enum", enum: ["PENDING", "ACCEPTED", "REFUSED"], default: "PENDING" })
  status!: SponsorRequestStatus;

  @Column({ type: "text", nullable: true, name: "admin_notes" })
  adminNotes?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "reviewed_by" })
  reviewedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "reviewed_at" })
  reviewedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
