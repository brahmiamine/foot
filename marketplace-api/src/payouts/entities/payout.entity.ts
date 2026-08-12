import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PayoutStatus } from '../enums/payout-status.enum';

/**
 * Reversement au vendeur. Scaffolding (TS-03) : entité prête, calcul du
 * solde et déclenchement réel du virement (US-47 à US-49, Epic E15) à
 * implémenter — cette table n'expose pour l'instant qu'un historique en
 * lecture, jamais de credentials de provider de paiement.
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

  @CreateDateColumn()
  createdAt: Date;
}
