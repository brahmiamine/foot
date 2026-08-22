import "reflect-metadata";
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type TicketSaleStatus =
  | "DRAFT"
  | "READY_FOR_REVIEW"
  | "APPROVED"
  | "SCHEDULED"
  | "OPEN"
  | "PAUSED"
  | "CLOSED"
  | "REJECTED";

@Entity({ name: "tk_ticket_sale_rules" })
export class TicketSaleRule {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "match_ticket_category_id" })
  matchTicketCategoryId!: string;

  @Column({
    type: "enum",
    enum: ["PUBLIC", "HOME_SUPPORTERS", "AWAY_SUPPORTERS"],
    name: "allowed_audience",
    default: "PUBLIC",
  })
  allowedAudience!: "PUBLIC" | "HOME_SUPPORTERS" | "AWAY_SUPPORTERS";

  @Column({
    type: "enum",
    enum: ["STRICT", "DECLARATIVE"],
    name: "audience_validation_mode",
    default: "DECLARATIVE",
  })
  audienceValidationMode!: "STRICT" | "DECLARATIVE";

  @Column({ type: "int", name: "max_tickets_per_user", default: 4 })
  maxTicketsPerUser!: number;

  /** TICK-003 — nombre maximal de billets gratuits/invitations pour cette offre. 0 = aucun autorisé (comportement historique). */
  @Column({ type: "int", name: "comp_quota", default: 0 })
  compQuota!: number;

  /** OB-003 : prévente réservée aux membres, règle serveur (jamais un claim client). */
  @Column({ type: "boolean", default: false, name: "presale_requires_membership" })
  presaleRequiresMembership!: boolean;

  /** NULL = tout membership actif qualifie ; sinon liste de codes (FAN/SOCIO/VIP/SUPPORTER/PARTNER). */
  @Column({ type: "json", nullable: true, name: "presale_membership_codes" })
  presaleMembershipCodes!: string[] | null;

  /** NULL = la restriction ne se lève jamais automatiquement. */
  @Column({ type: "datetime", nullable: true, name: "presale_ends_at" })
  presaleEndsAt!: Date | null;

  @Column({ type: "datetime", name: "starts_at", nullable: true })
  startsAt!: Date | null;

  @Column({ type: "datetime", name: "ends_at", nullable: true })
  endsAt!: Date | null;

  @Column({
    type: "enum",
    enum: ["DRAFT", "READY_FOR_REVIEW", "APPROVED", "SCHEDULED", "OPEN", "PAUSED", "CLOSED", "REJECTED"],
    default: "DRAFT",
  })
  status!: TicketSaleStatus;

  /** Hash des paramètres de vente + prix réellement approuvés. */
  @Column({ type: "char", length: 64, nullable: true, name: "approved_fingerprint" })
  approvedFingerprint!: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "submitted_by" })
  submittedBy!: string | null;

  @Column({ type: "datetime", nullable: true, name: "submitted_at" })
  submittedAt!: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "approved_by" })
  approvedBy!: string | null;

  @Column({ type: "datetime", nullable: true, name: "approved_at" })
  approvedAt!: Date | null;

  @Column({ type: "text", nullable: true, name: "rejection_reason" })
  rejectionReason!: string | null;

  @Column({ type: "int", default: 1 })
  version!: number;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
