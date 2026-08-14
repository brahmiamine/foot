import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Cart } from './cart.entity';

/**
 * TASK-P0-004 (todo.md). Une ligne de panier — productId/variantId ne sont
 * jamais fait confiance pour le prix/la disponibilité affichés ailleurs :
 * CartService.addItem valide leur existence à l'ajout, mais seul
 * CheckoutService.checkout revalide tout au moment décisif (prix, statut
 * publié, vendeur, stock) juste avant de créer la commande.
 */
@Entity('sp_cart_items')
@Unique(['cartId', 'productId', 'variantId'])
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 191 })
  cartId: string;

  @ManyToOne(() => Cart, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cartId' })
  cart: Cart;

  @Column({ type: 'varchar', length: 191 })
  productId: string;

  @Column({ type: 'varchar', length: 191, nullable: true })
  variantId: string | null;

  @Column({ type: 'int' })
  quantity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
