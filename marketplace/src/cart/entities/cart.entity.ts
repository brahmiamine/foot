import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { CartItem } from './cart-item.entity';

/**
 * TASK-P0-004 (todo.md). Panier serveur d'un membre — un seul panier ouvert
 * par membre (contrainte unique sur memberId), jamais côté client. Vidé par
 * CheckoutService une fois converti en MarketOrder.
 */
@Entity('sp_carts')
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 191 })
  memberId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany('CartItem', (i: CartItem) => i.cart)
  items: CartItem[];
}
