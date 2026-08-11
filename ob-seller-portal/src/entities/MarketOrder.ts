import "reflect-metadata";
import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import type { SellerOrder } from "./SellerOrder";

/**
 * Commande globale passée par un supporter sur le site OB — peut contenir
 * les produits de plusieurs vendeurs. Dans l'architecture cible cette table
 * appartient à la Marketplace API ; elle est répliquée ici uniquement pour
 * permettre au Seller Portal de fonctionner de façon autonome en V1.
 * Le Seller Portal ne lit/n'écrit jamais cette table directement pour un
 * vendeur : il passe systématiquement par SellerOrder (sa sous-commande).
 */
@Entity({ name: "sp_market_orders" })
export class MarketOrder {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 40 })
  orderNumber!: string;

  @Column({ type: "varchar", length: 191 })
  customerName!: string;

  @Column({ type: "varchar", length: 191 })
  customerEmail!: string;

  @Column({ type: "varchar", length: 32, nullable: true })
  customerPhone!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  shippingAddress!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  totalAmount!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany("SellerOrder", (o: SellerOrder) => o.marketOrder)
  sellerOrders!: SellerOrder[];
}
