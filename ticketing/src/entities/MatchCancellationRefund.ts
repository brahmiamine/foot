import "reflect-metadata";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type MatchCancellationRefundStatus =
  | "PENDING_REFUND_REQUEST"
  | "REQUESTED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "MANUAL_REVIEW";

/**
 * TASK-P0-003 (todo.md) : dossier de réconciliation corrélé ouvert pour
 * chaque paiement de billets encore PAID au moment où un match passe
 * CANCELLED (federation-hub, `cancelMatchAdmin`) — même modèle que
 * `StockUnavailableRefund` (TASK-P0-002), même limites côté payments
 * (Konnect/Paymee et tout remboursement partiel passent par MANUAL_REVIEW,
 * voir payments/README.md § Remboursements). Un seul dossier par
 * paiement (contrainte unique sur payment_id) : tous les billets d'un même
 * achat partagent le même `payment_id` (voir Ticket.paymentId), donc un
 * seul remboursement total couvre l'intégralité de cet achat. `matchId`
 * n'est là que pour retrouver rapidement les dossiers d'un match donné
 * (audit) — la source de vérité du montant/paiement reste `payment_id`.
 * Traité par src/lib/matchCancellationRefunds.ts.
 */
@Entity({ name: "tk_match_cancellation_refunds" })
export class MatchCancellationRefund {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "char", length: 36, name: "match_id" })
  matchId!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 36, name: "payment_id" })
  paymentId!: string;

  @Column({ type: "varchar", length: 36, name: "refund_id", nullable: true })
  refundId!: string | null;

  @Column({
    type: "enum",
    enum: ["PENDING_REFUND_REQUEST", "REQUESTED", "PROCESSING", "SUCCEEDED", "FAILED", "MANUAL_REVIEW"],
    name: "refund_status",
    default: "PENDING_REFUND_REQUEST",
  })
  refundStatus!: MatchCancellationRefundStatus;

  @CreateDateColumn({ type: "datetime", name: "detected_at" })
  detectedAt!: Date;

  @Column({ type: "datetime", name: "last_checked_at", nullable: true })
  lastCheckedAt!: Date | null;

  @Column({ type: "datetime", name: "resolved_at", nullable: true })
  resolvedAt!: Date | null;

  @Column({ type: "datetime", name: "ops_alerted_at", nullable: true })
  opsAlertedAt!: Date | null;
}
