import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentReconciliationEventAction } from '../payment-reconciliation.enums';

@Entity('payment_reconciliation_events')
export class PaymentReconciliationEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  caseId: string;

  @Column({ type: 'enum', enum: PaymentReconciliationEventAction })
  action: PaymentReconciliationEventAction;

  @Column({ type: 'varchar', length: 100 })
  actorApplication: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  actorUser: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'json', nullable: true })
  beforeState: Record<string, unknown> | null;

  @Column({ type: 'json', nullable: true })
  afterState: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
