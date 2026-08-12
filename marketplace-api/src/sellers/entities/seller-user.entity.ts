import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SellerUserRole, SellerUserStatus } from '../enums/seller-status.enum';
import { Seller } from './seller.entity';

/**
 * Compte pouvant se connecter aux endpoints self-service vendeur (voir
 * SellerJwtGuard). En V1 un seul compte OWNER par vendeur suffit, mais le
 * modèle supporte déjà plusieurs comptes (MANAGER, STAFF) par vendeur.
 */
@Entity('seller_users')
export class SellerUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 191 })
  sellerId: string;

  @ManyToOne('Seller', (s: Seller) => s.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' })
  seller: Seller;

  @Column({ type: 'varchar', length: 191 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 191 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: SellerUserRole,
    default: SellerUserRole.OWNER,
  })
  role: SellerUserRole;

  @Column({
    type: 'enum',
    enum: SellerUserStatus,
    default: SellerUserStatus.ACTIVE,
  })
  status: SellerUserStatus;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
