import "reflect-metadata";
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

export type TicketGrantStatus = "PENDING" | "APPROVED" | "REJECTED";

/**
 * TICK-003 — billet gratuit/invitation. Une demande (PENDING) doit être
 * approuvée par un autre membre du staff que le demandeur (maker/checker,
 * même principe que TicketSaleRule) avant que les billets ne soient
 * effectivement créés dans tk_tickets (source='GRANT'). Le quota autorisé
 * vit sur TicketSaleRule.compQuota, jamais dupliqué ici.
 */
@Entity({ name: "tk_ticket_grants" })
export class TicketGrant {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "char", length: 36, name: "match_ticket_category_id" })
  matchTicketCategoryId!: string;

  @Column({ type: "varchar", length: 191, name: "requested_by_user_id" })
  requestedByUserId!: string;

  @Column({ type: "varchar", length: 191, name: "recipient_name" })
  recipientName!: string;

  @Column({ type: "varchar", length: 255, nullable: true, name: "recipient_email" })
  recipientEmail!: string | null;

  @Column({ type: "int" })
  quantity!: number;

  @Column({ type: "text" })
  reason!: string;

  @Column({ type: "enum", enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" })
  status!: TicketGrantStatus;

  @Column({ type: "varchar", length: 191, nullable: true, name: "approved_by_user_id" })
  approvedByUserId!: string | null;

  @Column({ type: "datetime", nullable: true, name: "approved_at" })
  approvedAt!: Date | null;

  @Column({ type: "text", nullable: true, name: "rejection_reason" })
  rejectionReason!: string | null;

  @Column({ type: "json", nullable: true, name: "ticket_ids" })
  ticketIds!: string[] | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
