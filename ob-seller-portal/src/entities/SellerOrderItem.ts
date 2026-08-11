import "reflect-metadata";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { SellerOrder } from "./SellerOrder";

/**
 * Ligne de commande. Le nom/SKU sont dupliqués (snapshot) au moment de la
 * commande pour ne pas dépendre d'un produit qui pourrait être modifié ou
 * supprimé ensuite.
 */
@Entity({ name: "sp_seller_order_items" })
export class SellerOrderItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 191 })
  sellerOrderId!: string;

  @ManyToOne("SellerOrder", (o: SellerOrder) => o.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sellerOrderId" })
  sellerOrder!: SellerOrder;

  @Column({ type: "varchar", length: 191, nullable: true })
  productId!: string | null;

  @Column({ type: "varchar", length: 191, nullable: true })
  variantId!: string | null;

  @Column({ type: "varchar", length: 191 })
  productName!: string;

  @Column({ type: "varchar", length: 120 })
  sku!: string;

  @Column({ type: "varchar", length: 191, nullable: true })
  variantLabel!: string | null;

  @Column({ type: "int" })
  quantity!: number;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  unitPrice!: string;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  totalPrice!: string;
}
