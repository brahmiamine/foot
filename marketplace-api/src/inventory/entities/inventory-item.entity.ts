import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { ProductVariant } from '../../variants/entities/product-variant.entity';

/**
 * Une ligne de stock par produit (sans variantes) ou par variante.
 * `available` est la seule quantité que le vendeur peut modifier
 * directement (voir InventoryService.setAvailable) ; `reserved`/`sold`
 * sont dérivés exclusivement des réservations transactionnelles
 * (TASK-P0-005, todo.md — voir InventoryService.reserveStock/
 * confirmReservation/releaseReservation), jamais assignés directement.
 */
@Entity('sp_inventory_items')
@Index(['productId', 'variantId'], { unique: true })
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 191 })
  sellerId: string;

  @Column({ type: 'varchar', length: 191 })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'varchar', length: 191, nullable: true })
  variantId: string | null;

  @OneToOne(() => ProductVariant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariant | null;

  @Column({ type: 'int', default: 0 })
  available: number;

  /**
   * Null = pas d'alerte configurée. Quand renseigné, une notification
   * LOW_STOCK est envoyée au vendeur la première fois que `available`
   * passe à ce seuil ou en-dessous (voir InventoryService.setAvailable) —
   * pas à chaque sauvegarde tant que le stock reste bas, pour éviter le spam.
   */
  @Column({ type: 'int', nullable: true })
  lowStockThreshold: number | null;

  @Column({ type: 'int', default: 0 })
  reserved: number;

  @Column({ type: 'int', default: 0 })
  sold: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
