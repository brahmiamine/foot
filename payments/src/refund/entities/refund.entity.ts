import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentProviderName } from '../../payment/enums/payment-provider.enum';
import { RefundApprovalMode } from '../enums/refund-approval-mode.enum';
import { RefundStatus } from '../enums/refund-status.enum';

/**
 * A single refund operation against a Payment. Several Refund rows may exist
 * for the same paymentId (partial refunds); RefundService computes the
 * remaining refundable amount server-side from this table.
 */
@Entity('refunds')
@Unique(['paymentId', 'idempotencyKey'])
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  paymentId: string;

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

  @Column({ type: 'varchar', length: 100 })
  initiatedByApplication: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  initiatedByUser: string | null;

  /**
   * PAY-002 immutable approval-policy snapshot. These fields are optional at
   * the TypeScript boundary so legacy pre-migration fixtures/records remain
   * representable during rolling upgrades; the migration backfills existing
   * rows and the database columns/defaults govern every persisted new row.
   */
  @Column({
    type: 'enum',
    enum: RefundApprovalMode,
    default: RefundApprovalMode.SINGLE_APPROVAL,
  })
  approvalMode?: RefundApprovalMode;

  @Column({ type: 'int', default: 0 })
  approvalPolicyVersion?: number;

  @Column({ type: 'tinyint', default: 1 })
  approvalMakerCheckerEnabled?: boolean;

  @Column({ type: 'varchar', length: 191, nullable: true })
  approvalMakerPrincipal?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  approval1ByUser?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approval1At?: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  approval2ByUser?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approval2At?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date | null;

  @Column({ type: 'varchar', length: 191, nullable: true })
  providerRefundRef: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  lastProviderStatus: string | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ type: 'text', nullable: true })
  manualReviewReason: string | null;

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
