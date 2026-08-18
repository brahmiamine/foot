import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { Team } from "./Team";

/** OB-002 : types de membership configurables par club. */
export type MembershipTypeCode = "FAN" | "SOCIO" | "VIP" | "SUPPORTER" | "PARTNER";
export const MEMBERSHIP_TYPE_CODES: MembershipTypeCode[] = ["FAN", "SOCIO", "VIP", "SUPPORTER", "PARTNER"];

/**
 * `SUBMITTED` : candidature en attente d'approbation (type `requiresApproval`).
 * `ACTIVE` : membership en vigueur (auto ou après approbation), consommable
 * par les autres services (ex. OB-003, prévente billetterie).
 * `EXPIRED`/`REJECTED`/`CANCELLED` sont terminaux.
 */
export type MembershipStatus = "SUBMITTED" | "ACTIVE" | "REJECTED" | "EXPIRED" | "CANCELLED";

/** Configuration d'un type de membership pour un club (droits/durée/approbation). */
@Entity("cms_membership_types")
@Unique(["teamId", "code"])
export class MembershipType {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "enum", enum: MEMBERSHIP_TYPE_CODES })
  code!: MembershipTypeCode;

  @Column({ type: "varchar", length: 120, name: "label_fr" })
  labelFr!: string;

  @Column({ type: "varchar", length: 120, nullable: true, name: "label_ar" })
  labelAr!: string | null;

  @Column({ type: "tinyint", default: 1, name: "is_active" })
  isActive!: boolean;

  @Column({ type: "tinyint", default: 0, name: "requires_approval" })
  requiresApproval!: boolean;

  /** NULL = pas d'expiration automatique. */
  @Column({ type: "int", nullable: true, name: "duration_days" })
  durationDays!: number | null;

  /**
   * Codes de droits libres (ex. "PRESALE_ACCESS", "SHOP_DISCOUNT") —
   * catalogue ouvert, à l'image de `Notification.category` (§32 notifications) :
   * ce service ne les interprète jamais, les consommateurs (ex. OB-003) le font.
   */
  @Column({ type: "json", nullable: true })
  rights!: string[] | null;

  @Column({ type: "int", default: 1 })
  version!: number;

  @Column({ type: "varchar", length: 191, nullable: true, name: "updated_by" })
  updatedBy!: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}

/** Une instance de membership pour un membre donné. */
@Entity("cms_memberships")
@Index(["teamId", "userId", "status"])
export class Membership {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "char", length: 36, name: "membership_type_id" })
  membershipTypeId!: string;

  @ManyToOne(() => MembershipType)
  @JoinColumn({ name: "membership_type_id" })
  membershipType!: MembershipType;

  @Column({ type: "enum", enum: ["SUBMITTED", "ACTIVE", "REJECTED", "EXPIRED", "CANCELLED"], default: "SUBMITTED" })
  status!: MembershipStatus;

  @Column({ type: "datetime", nullable: true, name: "approved_at" })
  approvedAt!: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "approved_by" })
  approvedBy!: string | null;

  @Column({ type: "text", nullable: true, name: "rejection_reason" })
  rejectionReason!: string | null;

  /** NULL = pas d'expiration (type sans `durationDays`). */
  @Column({ type: "datetime", nullable: true, name: "expires_at" })
  expiresAt!: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
