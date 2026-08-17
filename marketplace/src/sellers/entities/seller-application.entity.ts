import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SellerApplicationStatus } from '../enums/seller-application-status.enum';

export interface SellerApplicationDocument {
  label: string;
  url: string;
}

@Entity('sp_seller_applications')
@Index(['clubId', 'status'])
@Index(['clubId', 'email'])
export class SellerApplication {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 36 }) clubId: string;
  @Column({ type: 'varchar', length: 191 }) businessName: string;
  @Column({ type: 'varchar', length: 191 }) ownerName: string;
  @Column({ type: 'varchar', length: 191 }) email: string;
  @Column({ type: 'varchar', length: 32, nullable: true }) phone: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) address:
    string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) city: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) country:
    string | null;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) activityCategory:
    string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) taxId:
    string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) tradeRegister:
    string | null;
  @Column({ type: 'json', nullable: true }) documents:
    SellerApplicationDocument[] | null;
  @Column({
    type: 'enum',
    enum: SellerApplicationStatus,
    default: SellerApplicationStatus.PENDING,
  })
  status: SellerApplicationStatus;
  @Column({ type: 'text', nullable: true }) rejectionReason: string | null;
  @Column({ type: 'varchar', length: 191, nullable: true }) reviewedBy:
    string | null;
  @Column({ type: 'datetime', nullable: true }) reviewedAt: Date | null;
  @Column({ type: 'char', length: 36, nullable: true }) sellerId: string | null;
  @CreateDateColumn({ type: 'datetime', precision: 6 }) createdAt: Date;
  @UpdateDateColumn({ type: 'datetime', precision: 6 }) updatedAt: Date;
}
