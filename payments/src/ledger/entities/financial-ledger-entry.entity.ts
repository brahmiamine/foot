import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  FinancialBeneficiaryType,
  FinancialLedgerComponent,
} from '../financial-ledger.enums';

@Entity('financial_ledger_entries')
export class FinancialLedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'char', length: 64 })
  entryKey: string;

  @Index()
  @Column({ type: 'enum', enum: FinancialLedgerComponent })
  component: FinancialLedgerComponent;

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  paymentId: string | null;

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  refundId: string | null;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  sourceApplication: string;

  @Column({ type: 'varchar', length: 191 })
  sourceEventId: string;

  @Column({ type: 'enum', enum: FinancialBeneficiaryType })
  beneficiaryType: FinancialBeneficiaryType;

  @Column({ type: 'varchar', length: 191, nullable: true })
  beneficiaryId: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  amount: string;

  @Column({ type: 'varchar', length: 3, default: 'TND' })
  currency: string;

  @Column({ type: 'datetime' })
  occurredAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
