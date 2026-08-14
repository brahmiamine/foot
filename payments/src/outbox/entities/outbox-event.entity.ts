import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum OutboxEventStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

/**
 * TS-12 (avancement.md) : remplace le couplage `Payment → PAID →
 * EventEmitter2 → listeners` (perdu si le process crashe entre le commit et
 * l'émission, ou si un listener échoue sans persistance) par un outbox
 * transactionnel. `PaymentService` insère la ligne dans LA MÊME transaction
 * DB que la transition PAID (voir payment.service.ts) : soit les deux
 * committent ensemble, soit aucun des deux. `OutboxWorkerService` (TS-13)
 * est seul responsable de la livraison effective, avec retry durable —
 * jamais PaymentService lui-même.
 */
@Entity('payment_outbox_events')
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  eventType: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  aggregateId: string;

  @Column({ type: 'json' })
  payload: Record<string, unknown>;

  @Index()
  @Column({
    type: 'enum',
    enum: OutboxEventStatus,
    default: OutboxEventStatus.PENDING,
  })
  status: OutboxEventStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  // NULL = prêt à traiter dès le prochain passage du worker. Fixé après un
  // échec, selon RETRY_SCHEDULE_MINUTES (TS-13, voir retry-schedule.ts).
  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;
}
