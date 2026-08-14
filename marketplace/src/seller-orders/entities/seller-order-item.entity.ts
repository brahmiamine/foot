import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SellerOrder } from './seller-order.entity';

/**
 * Ligne de commande. Le nom/SKU sont dupliqués (snapshot) au moment de la
 * commande pour ne pas dépendre d'un produit qui pourrait être modifié ou
 * supprimé ensuite.
 */
@Entity('sp_seller_order_items')
export class SellerOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 191 })
  sellerOrderId: string;

  @ManyToOne('SellerOrder', (o: SellerOrder) => o.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sellerOrderId' })
  sellerOrder: SellerOrder;

  @Column({ type: 'varchar', length: 191, nullable: true })
  productId: string | null;

  @Column({ type: 'varchar', length: 191, nullable: true })
  variantId: string | null;

  @Column({ type: 'varchar', length: 191 })
  productName: string;

  @Column({ type: 'varchar', length: 120 })
  sku: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  unitPrice: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  totalPrice: string;

  // StockReservation.id (inventory module, TASK-P0-005) couvrant cette
  // ligne — sert de référence pour confirmReservation (paiement confirmé)
  // / releaseReservation (paiement échoué/expiré). Nullable seulement pour
  // une ligne dont le produit n'a pas de InventoryItem configuré (jamais le
  // cas en pratique : CheckoutService refuse une ligne sans stock suivi,
  // voir revalidateCartItem), jamais laissé null après une commande créée
  // avec succès.
  @Column({ type: 'varchar', length: 191, nullable: true })
  reservationId: string | null;
}
