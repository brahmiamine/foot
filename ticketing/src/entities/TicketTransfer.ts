import "reflect-metadata";
import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

export type TicketTransferStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";

/**
 * TICK-006 — transfert de billet. Une ligne par tentative, jamais mutée
 * rétroactivement au-delà de sa propre progression de statut (même principe
 * que club-hub/PlayerTransfer.ts). `deadline` est le moment au-delà duquel
 * la demande expire faute d'acceptation — distinct de la coupure globale
 * `transferDeadlineHoursBeforeKickoff` (TicketingGovernanceSettings) qui,
 * elle, interdit toute NOUVELLE demande trop près du coup d'envoi.
 */
@Entity({ name: "tk_ticket_transfers" })
export class TicketTransfer {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "char", length: 36, name: "ticket_id" })
  ticketId!: string;

  @Column({ type: "varchar", length: 191, name: "from_purchaser_id" })
  fromPurchaserId!: string;

  @Column({ type: "varchar", length: 255, name: "to_email" })
  toEmail!: string;

  @Column({ type: "varchar", length: 191, nullable: true, name: "to_purchaser_id" })
  toPurchaserId!: string | null;

  @Column({ type: "enum", enum: ["PENDING", "ACCEPTED", "EXPIRED", "CANCELLED"], default: "PENDING" })
  status!: TicketTransferStatus;

  @Column({ type: "datetime", name: "requested_at" })
  requestedAt!: Date;

  @Column({ type: "datetime" })
  deadline!: Date;

  @Column({ type: "datetime", nullable: true, name: "activated_at" })
  activatedAt!: Date | null;

  @Column({ type: "datetime", nullable: true, name: "cancelled_at" })
  cancelledAt!: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "cancelled_by" })
  cancelledBy!: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
