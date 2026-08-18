import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentProviderName } from '../enums/payment-provider.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import {
  PaymentReconciliationCaseStatus,
  PaymentReconciliationDiscrepancyType,
  PaymentReconciliationEvidenceSource,
  PaymentReconciliationResolutionAction,
} from '../payment-reconciliation.enums';

@Entity('payment_reconciliation_cases')
@Unique(['paymentId'])
export class PaymentReconciliationCase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  paymentId: string;

  @Column({ type: 'enum', enum: PaymentProviderName })
  provider: PaymentProviderName;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  consumerApplication: string | null;

  @Index()
  @Column({ type: 'enum', enum: PaymentReconciliationCaseStatus })
  status: PaymentReconciliationCaseStatus;

  @Column({ type: 'enum', enum: PaymentReconciliationDiscrepancyType })
  discrepancyType: PaymentReconciliationDiscrepancyType;

  @Column({ type: 'enum', enum: PaymentReconciliationEvidenceSource })
  evidenceSource: PaymentReconciliationEvidenceSource;

  @Column({ type: 'enum', enum: PaymentStatus })
  internalStatus: PaymentStatus;

  @Column({ type: 'varchar', length: 64, nullable: true })
  providerStatus: string | null;

  @Column({ type: 'enum', enum: PaymentStatus, nullable: true })
  mappedProviderStatus: PaymentStatus | null;

  @Column({ type: 'char', length: 64 })
  fingerprint: string;

  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @Column({ type: 'datetime' })
  detectedAt: Date;

  @Column({ type: 'datetime' })
  lastCheckedAt: Date;

  @Column({ type: 'int', default: 1 })
  checkCount: number;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @Column({
    type: 'enum',
    enum: PaymentReconciliationResolutionAction,
    nullable: true,
  })
  resolutionAction: PaymentReconciliationResolutionAction | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  resolvedByApplication: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  resolvedByUser: string | null;

  @Column({ type: 'text', nullable: true })
  resolutionNote: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
