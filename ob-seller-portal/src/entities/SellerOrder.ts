import "reflect-metadata";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { SellerOrderStatus } from "./enums";
import { MarketOrder } from "./MarketOrder";
import { Seller } from "./Seller";
import type { SellerOrderItem } from "./SellerOrderItem";

/**
 * Sous-commande d'un vendeur au sein d'une commande globale. C'est la seule
 * vue qu'un vendeur a sur une commande — jamais MarketOrder en entier.
 */
@Entity({ name: "sp_seller_orders" })
@Index(["sellerId", "status"])
export class SellerOrder {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 191 })
  orderId!: string;

  @ManyToOne("MarketOrder", (o: MarketOrder) => o.sellerOrders, { onDelete: "CASCADE" })
  @JoinColumn({ name: "orderId" })
  marketOrder!: MarketOrder;

  @Column({ type: "varchar", length: 191 })
  sellerId!: string;

  @ManyToOne("Seller", { onDelete: "CASCADE" })
  @JoinColumn({ name: "sellerId" })
  seller!: Seller;

  @Column({ type: "enum", enum: SellerOrderStatus, default: SellerOrderStatus.PENDING })
  status!: SellerOrderStatus;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  subtotal!: string;

  // Taux figé au moment de la commande (indépendant d'une future
  // modification de Seller.commissionRate).
  @Column({ type: "decimal", precision: 5, scale: 2 })
  commissionRate!: string;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  commissionAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  netAmount!: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  shippingCarrier!: string | null;

  @Column({ type: "varchar", length: 191, nullable: true })
  trackingNumber!: string | null;

  @Column({ type: "datetime", nullable: true })
  shippedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  deliveredAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany("SellerOrderItem", (i: SellerOrderItem) => i.sellerOrder)
  items!: SellerOrderItem[];
}
