import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Order } from "./Order";
import { Product } from "./Product";

/**
 * OrderItem Entity — ligne d'une commande boutique. `productName`/
 * `unitPrice` sont dupliqués en snapshot au moment de la commande pour
 * rester corrects même si le produit est ensuite modifié ou supprimé
 * (`productId` reste nullable, ON DELETE SET NULL).
 */
@Entity("cms_order_items")
export class OrderItem {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "order_id" })
  orderId!: number;

  @ManyToOne(() => Order, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order!: Order;

  @Column({ type: "bigint", nullable: true, name: "product_id" })
  productId?: number | null;

  @ManyToOne(() => Product, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "product_id" })
  product?: Product | null;

  @Column({ type: "varchar", length: 200, name: "product_name" })
  productName!: string;

  @Column({ type: "int", default: 1 })
  quantity!: number;

  @Column({ type: "decimal", precision: 10, scale: 3, name: "unit_price" })
  unitPrice!: string;
}
