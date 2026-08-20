import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";
import { SponsorRequest } from "./SponsorRequest";
import type { SponsorLogoSize, SponsorLevel } from "./SponsorRequest";

export type SponsorWorkflowStatus = "CONTRACT_DRAFT" | "APPROVAL_PENDING" | "APPROVED" | "ACTIVE" | "EXPIRED";

/** Dossier contractuel sponsor issu d'une demande de partenariat. */
@Entity("cms_sponsors")
export class Sponsor {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "bigint", nullable: true, name: "sponsor_request_id" })
  sponsorRequestId?: number | null;

  @ManyToOne(() => SponsorRequest, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "sponsor_request_id" })
  sponsorRequest?: SponsorRequest | null;

  @Column({ type: "varchar", length: 200, name: "company_name" })
  companyName!: string;

  @Column({ type: "varchar", length: 255, nullable: true, name: "logo_url" })
  logoUrl?: string | null;

  @Column({ type: "enum", enum: ["SMALL", "MEDIUM", "LARGE"], default: "MEDIUM", name: "logo_size" })
  logoSize!: SponsorLogoSize;

  @Column({ type: "varchar", length: 255, nullable: true })
  website?: string | null;

  @Column({ type: "enum", enum: ["OR", "ARGENT", "BRONZE", "LOCAL"], default: "LOCAL" })
  level!: SponsorLevel;

  /** Liste de codes séparés par virgule : HOME,FOOTER,MATCH_PAGES,SHOP */
  @Column({ type: "varchar", length: 255, nullable: true, name: "logo_placement" })
  logoPlacement?: string | null;

  @Column({ type: "date", nullable: true, name: "contract_start" })
  contractStart?: string | null;

  @Column({ type: "date", nullable: true, name: "contract_end" })
  contractEnd?: string | null;

  @Column({ type: "decimal", precision: 12, scale: 3, nullable: true, name: "contract_amount" })
  contractAmount?: string | null;

  @Column({
    type: "enum",
    enum: ["CONTRACT_DRAFT", "APPROVAL_PENDING", "APPROVED", "ACTIVE", "EXPIRED"],
    default: "CONTRACT_DRAFT",
    name: "workflow_status",
  })
  workflowStatus!: SponsorWorkflowStatus;

  @Column({ type: "varchar", length: 191, nullable: true, name: "contract_drafted_by" })
  contractDraftedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "contract_drafted_at" })
  contractDraftedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "activated_by" })
  activatedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "activated_at" })
  activatedAt?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "expired_at" })
  expiredAt?: Date | null;

  @Column({ type: "tinyint", default: 0, name: "is_active" })
  isActive!: boolean;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at", nullable: true })
  updatedAt?: Date | null;
}
