import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SellerStatus } from '../enums/seller-status.enum';
import type { SellerUser } from './seller-user.entity';

/**
 * Le vendeur tiers. Porte le catalogue produits/commandes de son club.
 * Mappée sur `sp_sellers`, la table existante de `seller-portal` (base
 * partagée `foot`, voir database.config.ts) — même ligne physique, pas une
 * copie. `clubId` référence logiquement `teams.id` : pas de contrainte FK
 * réelle, comme dans seller-portal.
 */
@Entity('sp_sellers')
export class Seller {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  clubId: string;

  @Column({ type: 'varchar', length: 191 })
  businessName: string;

  @Column({ type: 'varchar', length: 191 })
  ownerName: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 191 })
  email: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  country: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  activityCategory: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  taxId: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  tradeRegister: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ type: 'enum', enum: SellerStatus, default: SellerStatus.PENDING })
  status: SellerStatus;

  @Column({ type: 'text', nullable: true })
  statusReason: string | null;

  // Taux de commission par défaut appliqué à ce vendeur, défini par le club
  // uniquement. Pourcentage, ex: 10.00 = 10%.
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10 })
  commissionRate: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany('SellerUser', (u: SellerUser) => u.seller)
  users: SellerUser[];
}
