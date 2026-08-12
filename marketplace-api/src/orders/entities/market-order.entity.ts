import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Commande globale passée par un supporter — peut contenir les produits de
 * plusieurs vendeurs, chacun voyant sa part via SellerOrder (seller-orders
 * module). Scaffolding : aucune route de création tant que le tunnel
 * d'achat marketplace (panier multi-vendeurs, checkout, paiement) n'existe
 * pas côté frontend — voir avancement.md, Epic E05/E06.
 */
@Entity('sp_market_orders')
export class MarketOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40 })
  orderNumber: string;

  @Column({ type: 'varchar', length: 191 })
  customerName: string;

  @Column({ type: 'varchar', length: 191 })
  customerEmail: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  customerPhone: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  shippingAddress: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  totalAmount: string;

  @CreateDateColumn()
  createdAt: Date;
}
