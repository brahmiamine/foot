import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentProviderName } from '../enums/payment-provider.enum';

/**
 * Consumer-scoped payment routing policy.
 *
 * The consumer application is never supplied by request payloads: it is
 * resolved by ServiceAuthGuard from the x-api-key and used as the primary key.
 */
@Entity('payment_routing_policies')
export class PaymentRoutingPolicy {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  consumerApplication: string;

  @Column({ type: 'json' })
  enabledProviders: PaymentProviderName[];

  @Column({ type: 'enum', enum: PaymentProviderName })
  defaultProvider: PaymentProviderName;

  @Column({
    type: 'enum',
    enum: PaymentProviderName,
    nullable: true,
  })
  fallbackProvider: PaymentProviderName | null;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'varchar', length: 100 })
  updatedByApplication: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
