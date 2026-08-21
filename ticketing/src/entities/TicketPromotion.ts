import "reflect-metadata";
import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from "typeorm";

export type TicketPromotionDiscountType = "PERCENTAGE" | "FIXED_AMOUNT";
export type TicketPromotionStatus = "DRAFT" | "APPROVED";

/**
 * TICK-008 (P2) — promotion à code sur une offre match+catégorie donnée
 * (le "package" multi-catégories reste hors périmètre de ce lot, voir
 * platform-governance-roadmap.md). Doit être APPROVED (maker/checker,
 * comme TicketSaleRule) avant que purchaseTickets() ne l'applique, sauf si
 * `TicketingGovernanceSettings.promotionApprovalRequired` est désactivé.
 */
@Entity({ name: "tk_ticket_promotions" })
@Index(["matchTicketCategoryId", "code"], { unique: true })
export class TicketPromotion {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "char", length: 36, name: "match_ticket_category_id" })
  matchTicketCategoryId!: string;

  @Column({ type: "varchar", length: 64 })
  code!: string;

  @Column({ type: "enum", enum: ["PERCENTAGE", "FIXED_AMOUNT"], name: "discount_type" })
  discountType!: TicketPromotionDiscountType;

  @Column({ type: "decimal", precision: 10, scale: 3, name: "discount_value" })
  discountValue!: string;

  @Column({ type: "int", nullable: true, name: "max_uses" })
  maxUses!: number | null;

  @Column({ type: "int", name: "used_count", default: 0 })
  usedCount!: number;

  @Column({ type: "datetime", nullable: true, name: "starts_at" })
  startsAt!: Date | null;

  @Column({ type: "datetime", nullable: true, name: "ends_at" })
  endsAt!: Date | null;

  @Column({ type: "enum", enum: ["DRAFT", "APPROVED"], default: "DRAFT" })
  status!: TicketPromotionStatus;

  @Column({ type: "varchar", length: 191, name: "created_by" })
  createdBy!: string;

  @Column({ type: "varchar", length: 191, nullable: true, name: "approved_by" })
  approvedBy!: string | null;

  @Column({ type: "datetime", nullable: true, name: "approved_at" })
  approvedAt!: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
