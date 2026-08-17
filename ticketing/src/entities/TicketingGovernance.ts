import "reflect-metadata";
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

/** Gouvernance de vente propre à un club. Defaults legacy-safe côté service. */
@Entity({ name: "tk_governance_settings" })
export class TicketingGovernanceSettings {
  @PrimaryColumn({ type: "char", length: 36, name: "club_id" })
  clubId!: string;

  @Column({ type: "tinyint", name: "sale_approval_required", default: 1 })
  saleApprovalRequired!: boolean;

  @Column({ type: "tinyint", name: "maker_checker_enabled", default: 1 })
  makerCheckerEnabled!: boolean;

  @Column({ type: "tinyint", name: "price_reapproval_required", default: 1 })
  priceReapprovalRequired!: boolean;

  @Column({ type: "int", default: 1 })
  version!: number;

  @Column({ type: "varchar", length: 191, nullable: true, name: "updated_by" })
  updatedBy?: string | null;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
