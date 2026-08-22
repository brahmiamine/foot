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

  /** TICK-005 — fenêtre d'ouverture/fermeture des gates. NULL = aucune fenêtre imposée. */
  @Column({ type: "int", nullable: true, name: "gate_open_minutes_before_kickoff" })
  gateOpenMinutesBeforeKickoff!: number | null;

  @Column({ type: "int", nullable: true, name: "gate_close_minutes_after_kickoff" })
  gateCloseMinutesAfterKickoff!: number | null;

  /** TICK-005 — durée de validité du manifeste hors-ligne. NULL = pas d'expiration. */
  @Column({ type: "int", nullable: true, name: "offline_manifest_validity_minutes" })
  offlineManifestValidityMinutes!: number | null;

  /** TICK-006 — transfert de billet. */
  @Column({ type: "tinyint", name: "transfer_enabled", default: 0 })
  transferEnabled!: boolean;

  @Column({ type: "int", name: "transfer_deadline_hours_before_kickoff", default: 24 })
  transferDeadlineHoursBeforeKickoff!: number;

  @Column({ type: "int", name: "max_transfers_per_ticket", default: 1 })
  maxTransfersPerTicket!: number;

  /** TICK-007 — durée par défaut d'un abonnement saison lors du renouvellement. */
  @Column({ type: "int", name: "season_pass_duration_days", default: 365 })
  seasonPassDurationDays!: number;

  /** TICK-008 — une promotion doit être approuvée avant application, même maker/checker que la vente. */
  @Column({ type: "tinyint", name: "promotion_approval_required", default: 1 })
  promotionApprovalRequired!: boolean;

  @Column({ type: "int", default: 1 })
  version!: number;

  @Column({ type: "varchar", length: 191, nullable: true, name: "updated_by" })
  updatedBy?: string | null;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
