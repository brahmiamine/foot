import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentProviderName } from '../enums/payment-provider.enum';

/**
 * Internal, provider-agnostic payment record.
 * `providerRef` is the external reference returned by the provider
 * (e.g. Konnect's `paymentRef`) and is the join key used by webhooks.
 */
@Entity('payments')
// TASK-P0-005 (todo.md): guards a caller retrying POST /payments/*/init
// (network timeout, double click) from creating a second Payment — and a
// second provider-side charge — for the same logical request. Scoped by
// callerApplication rather than globally unique because idempotency keys
// are only meaningful within the app that generated them. NULLs (callers
// that don't send the header) don't collide: MySQL treats each NULL as
// distinct in a unique index, same as `providerRef` below.
@Unique(['callerApplication', 'idempotencyKey'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  orderId: string;

  // Shared `foot` User.id of the payer, when the caller has one (optional:
  // a payment can be initiated for a guest/anonymous checkout). Used only
  // to notify the payer via notification-api once PAID — see
  // src/notifications/payment-notifications.listener.ts.
  @Column({ type: 'varchar', length: 36, nullable: true })
  userId: string | null;

  // Application backend having called /payments/*/init (resolved from the
  // service API key by ServiceAuthGuard, see CurrentService decorator) —
  // used to route the outgoing payment webhook to the right app once PAID,
  // see src/webhooks/payment-webhook.listener.ts. Never trusted from the
  // request body: always derived server-side from the authenticated caller.
  @Column({ type: 'varchar', length: 100, nullable: true })
  callerApplication: string | null;

  // Value of the caller-supplied `Idempotency-Key` header on the init
  // request, if any. See the @Unique index above.
  @Column({ type: 'varchar', length: 255, nullable: true })
  idempotencyKey: string | null;

  @Column({
    type: 'enum',
    enum: PaymentProviderName,
    default: PaymentProviderName.KONNECT,
  })
  provider: PaymentProviderName;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  amount: string;

  @Column({ type: 'varchar', length: 3, default: 'TND' })
  currency: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  // MySQL treats NULL as distinct from any other value in a UNIQUE index,
  // so multiple payments can stay providerRef = NULL before initiation succeeds.
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 191, nullable: true })
  providerRef: string | null;

  @Column({ type: 'text', nullable: true })
  payUrl: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  lastProviderStatus: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  // Populated only for providers that report fees separately from the
  // requested amount (e.g. Paymee's received_amount/cost). `amount` above
  // always stays the order amount; these never modify it.
  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
  receivedAmount: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
  providerFee: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastWebhookAt: Date | null;

  @Column({ type: 'int', default: 0 })
  webhookReceivedCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
