import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('sp_seller_invites')
export class SellerInvite {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'char', length: 36 }) sellerId: string;
  @Index() @Column({ type: 'char', length: 36 }) sellerUserId: string;
  @Index({ unique: true })
  @Column({ type: 'char', length: 64 })
  tokenHash: string;
  @Column({ type: 'datetime' }) expiresAt: Date;
  @Column({ type: 'datetime', nullable: true }) usedAt: Date | null;
  @CreateDateColumn({ type: 'datetime', precision: 6 }) createdAt: Date;
}
