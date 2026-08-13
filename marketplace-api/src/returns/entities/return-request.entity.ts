import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReturnStatus } from '../enums/return-status.enum';
import { SellerOrder } from '../../seller-orders/entities/seller-order.entity';
import { SellerOrderItem } from '../../seller-orders/entities/seller-order-item.entity';

/**
 * Demande de retour initiée par le client. Workflow REQUESTED ->
 * APPROVED/REJECTED -> COMPLETED -> REFUND_FAILED|REFUNDED (US-50 à US-52,
 * Epic E16 ; TASK-P0-006 pour le lien remboursement/payout).
 */
@Entity('sp_return_requests')
export class ReturnRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 191 })
  sellerId: string;

  @Column({ type: 'varchar', length: 191 })
  sellerOrderId: string;

  @ManyToOne(() => SellerOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerOrderId' })
  sellerOrder: SellerOrder;

  @Column({ type: 'varchar', length: 191 })
  sellerOrderItemId: string;

  @ManyToOne(() => SellerOrderItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerOrderItemId' })
  sellerOrderItem: SellerOrderItem;

  @Column({ type: 'varchar', length: 191 })
  customerName: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: ReturnStatus, default: ReturnStatus.REQUESTED })
  status: ReturnStatus;

  // Refund.id de payment-api (TASK-P0-001) une fois la demande de
  // remboursement acceptée par payment-api — jamais renseigné tant que
  // l'appel n'a pas abouti (voir refundError pour l'échec de l'appel
  // lui-même).
  @Column({ type: 'varchar', length: 36, nullable: true })
  refundId: string | null;

  // Dernier statut connu du remboursement chez payment-api (REQUESTED,
  // PROCESSING, SUCCEEDED, FAILED, MANUAL_REVIEW) — relu périodiquement par
  // ReturnRefundReconciliationService tant qu'il n'est pas terminal.
  @Column({ type: 'varchar', length: 20, nullable: true })
  refundStatus: string | null;

  @Column({ type: 'datetime', nullable: true })
  refundRequestedAt: Date | null;

  // Motif du dernier échec — soit un refus applicatif de payment-api, soit
  // une indisponibilité réseau lors de la demande. Effacé dès qu'une
  // nouvelle tentative aboutit. Sert de trace visible pour l'opérateur
  // (retry-refund) sans dépendre des seuls logs applicatifs.
  @Column({ type: 'text', nullable: true })
  refundError: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
