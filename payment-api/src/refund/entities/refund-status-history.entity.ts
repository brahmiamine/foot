import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RefundStatus } from '../enums/refund-status.enum';

/**
 * TASK-P0-001 (todo.md): append-only audit trail of every status
 * transition a Refund goes through. Never updated or deleted — RefundService
 * only ever inserts a new row alongside a Refund status change, in the same
 * transaction. `fromStatus` is null for the row created alongside the
 * refund's initial insert.
 */
@Entity('refund_status_history')
export class RefundStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  refundId: string;

  @Column({ type: 'enum', enum: RefundStatus, nullable: true })
  fromStatus: RefundStatus | null;

  @Column({ type: 'enum', enum: RefundStatus })
  toStatus: RefundStatus;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  // Application or operator identity responsible for this transition
  // (e.g. "payment-api:flouci-refund-worker", "billetterie:ops:alice").
  @Column({ type: 'varchar', length: 150 })
  actor: string;

  @CreateDateColumn()
  createdAt: Date;
}
