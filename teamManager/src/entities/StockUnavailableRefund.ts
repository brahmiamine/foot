import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type StockUnavailableRefundStatus =
  | "PENDING_REFUND_REQUEST"
  | "REQUESTED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "MANUAL_REVIEW";

/**
 * TASK-P0-002 (todo.md) : dossier de réconciliation corrélé ouvert quand
 * reconcileOrderPayment détecte PAID_STOCK_UNAVAILABLE (paiement confirmé
 * après que le stock a déjà été restocké, voir
 * src/services/ShopOrderService.ts). Un seul dossier par paiement
 * (contrainte unique sur payment_id) — corrèle le paiement (payment_id), la
 * commande (shop_orders.payment_id, pas dupliqué ici) et le remboursement
 * (refund_id chez payment-api, voir TASK-P0-001). Même entité/pattern que
 * billetterie/src/entities/StockUnavailableRefund.ts, traité par
 * src/lib/stockUnavailableRefunds.ts.
 */
@Entity({ name: "shop_stock_unavailable_refunds" })
export class StockUnavailableRefund {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 36, name: "payment_id" })
  paymentId!: string;

  // NULL tant que la demande de remboursement auprès de payment-api n'a pas
  // encore réussi (payment-api indisponible au moment de la détection) —
  // repris par processStockUnavailableRefunds().
  @Column({ type: "varchar", length: 36, name: "refund_id", nullable: true })
  refundId!: string | null;

  @Column({
    type: "enum",
    enum: ["PENDING_REFUND_REQUEST", "REQUESTED", "PROCESSING", "SUCCEEDED", "FAILED", "MANUAL_REVIEW"],
    name: "refund_status",
    default: "PENDING_REFUND_REQUEST",
  })
  refundStatus!: StockUnavailableRefundStatus;

  @CreateDateColumn({ type: "datetime", name: "detected_at" })
  detectedAt!: Date;

  @Column({ type: "datetime", name: "last_checked_at", nullable: true })
  lastCheckedAt!: Date | null;

  // Renseigné une fois refundStatus = SUCCEEDED ou FAILED — jamais pour
  // MANUAL_REVIEW, qui reste un dossier ouvert tant qu'un opérateur ne l'a
  // pas tranché (voir payment-api POST /refunds/:id/{confirm,reject}).
  @Column({ type: "datetime", name: "resolved_at", nullable: true })
  resolvedAt!: Date | null;

  // Horodatage de l'alerte SLA (processStockUnavailableRefunds) — évite de
  // relog l'alerte à chaque passage du scheduler une fois déjà signalée.
  @Column({ type: "datetime", name: "ops_alerted_at", nullable: true })
  opsAlertedAt!: Date | null;
}
