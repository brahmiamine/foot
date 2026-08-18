import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import {
  FinancialBeneficiaryType,
  PaymentAllocationComponent,
} from '../financial-ledger.enums';

@Entity('payment_financial_allocations')
@Unique(['paymentId', 'component', 'reference'])
export class PaymentFinancialAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  paymentId: string;

  @Column({ type: 'enum', enum: PaymentAllocationComponent })
  component: PaymentAllocationComponent;

  @Column({ type: 'enum', enum: FinancialBeneficiaryType })
  beneficiaryType: FinancialBeneficiaryType;

  @Column({ type: 'varchar', length: 191, nullable: true })
  beneficiaryId: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  amount: string;

  @Column({ type: 'varchar', length: 191 })
  reference: string;

  @Column({ type: 'varchar', length: 100 })
  sourceApplication: string;

  @CreateDateColumn()
  createdAt: Date;
}
