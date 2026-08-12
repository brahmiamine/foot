import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

/**
 * ShopOrderItem Entity — une ligne de commande. Fige `productNameFr` et
 * `unitPrice` au moment de l'achat (snapshot) : le catalogue peut évoluer
 * après coup (prix modifié, produit renommé/désactivé) sans jamais changer
 * ce qu'un client a réellement payé.
 */
@Entity({ name: "shop_order_items" })
export class ShopOrderItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "order_id" })
  orderId!: string;

  @Column({ type: "bigint", name: "product_id" })
  productId!: number;

  @Column({ type: "varchar", length: 200, name: "product_name_fr" })
  productNameFr!: string;

  @Column({ type: "decimal", precision: 10, scale: 3, name: "unit_price" })
  unitPrice!: string;

  @Column({ type: "int" })
  quantity!: number;

  @Column({ type: "decimal", precision: 10, scale: 3, name: "line_total" })
  lineTotal!: string;
}
