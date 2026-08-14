import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { RefundStatus } from '../enums/refund-status.enum';
import { PaymentProviderName } from '../../payment/enums/payment-provider.enum';

/**
 * TASK-P0-001 (todo.md): a single refund operation against a Payment.
 * Several Refund rows may exist for the same paymentId (partial refunds);
 * RefundService computes the remaining refundable amount server-side from
 * this table, never trusting a client-supplied "already refunded" figure.
 */
@Entity('refunds')
// Guards a caller retrying POST /payments/:id/refunds (network timeout,
// double click) from creating a second refund attempt for the same logical
// operation — same pattern as Payment.(callerApplication, idempotencyKey).
// NULLs don't collide (MySQL treats each NULL as distinct in a unique index).
@Unique(['paymentId', 'idempotencyKey'])
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  paymentId: string;

  // Denormalized from Payment at creation time so provider dispatch never
  // needs a second lookup, and so the record stays meaningful even if the
  // payment's own provider field were ever to change.
  @Column({ type: 'enum', enum: PaymentProviderName })
  provider: PaymentProviderName;

  @Column({ type: 'varchar', length: 255, nullable: true })
  idempotencyKey: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  amount: string;

  @Column({ type: 'varchar', length: 3, default: 'TND' })
  currency: string;

  @Column({
    type: 'enum',
    enum: RefundStatus,
    default: RefundStatus.REQUESTED,
  })
  status: RefundStatus;

  @Column({ type: 'text' })
  reason: string;

  // Identity of the caller who requested the refund — the application
  // backend (via ServiceAuthGuard) plus, when known, the operator/user
  // acting through it. Never trusted for authorization, only for audit.
  @Column({ type: 'varchar', length: 100 })
  initiatedByApplication: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  initiatedByUser: string | null;

  // Refund identifier returned by the provider (e.g. Flouci's refund_id).
  // Never populated for providers without an automated refund API.
  @Column({ type: 'varchar', length: 191, nullable: true })
  providerRefundRef: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  lastProviderStatus: string | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  // Set when status = MANUAL_REVIEW: why this couldn't be automated
  // (provider has no refund API) so an operator knows what to do without
  // guessing from the code.
  @Column({ type: 'text', nullable: true })
  manualReviewReason: string | null;

  // Populated once an operator resolves a MANUAL_REVIEW or retries a FAILED
  // refund via the reconciliation endpoints — see RefundController.
  @Column({ type: 'varchar', length: 100, nullable: true })
  resolvedByUser: string | null;

  @Column({ type: 'text', nullable: true })
  resolutionNote: string | null;

  @Column({ type: 'timestamp', nullable: true })
  succeededAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
