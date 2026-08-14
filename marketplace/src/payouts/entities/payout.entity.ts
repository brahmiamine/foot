import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PayoutStatus } from '../enums/payout-status.enum';

/**
 * Reversement au vendeur (E15, US-47 à US-49). `lastError`/`attempts`
 * portent l'audit d'échec (US-49) : un payout FAILED garde la raison de son
 * dernier échec, `attempts` incrémenté à chaque passage PENDING ->
 * PROCESSING (compte les tentatives, pas seulement les échecs).
 */
@Entity('sp_payouts')
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 191 })
  sellerId: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40 })
  reference: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  amount: string;

  @Column({ type: 'enum', enum: PayoutStatus, default: PayoutStatus.PENDING })
  status: PayoutStatus;

  @Column({ type: 'date' })
  periodStart: string;

  @Column({ type: 'date' })
  periodEnd: string;

  @Column({ type: 'datetime', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  lastError: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
