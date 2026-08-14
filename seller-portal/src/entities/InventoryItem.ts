import "reflect-metadata";
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Product } from "./Product";
import { ProductVariant } from "./ProductVariant";

/**
 * Une ligne de stock par produit (sans variantes) ou par variante.
 * `available` est la seule quantité que le vendeur peut modifier
 * directement ; `reserved` (commandes en cours) et `sold` sont dérivés du
 * traitement des commandes côté API — jamais éditables depuis le frontend.
 */
@Entity({ name: "sp_inventory_items" })
@Index(["productId", "variantId"], { unique: true })
export class InventoryItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 191 })
  sellerId!: string;

  @Column({ type: "varchar", length: 191 })
  productId!: string;

  @ManyToOne("Product", (p: Product) => p.inventoryItems, { onDelete: "CASCADE" })
  @JoinColumn({ name: "productId" })
  product!: Product;

  @Column({ type: "varchar", length: 191, nullable: true })
  variantId!: string | null;

  @OneToOne("ProductVariant", (v: ProductVariant) => v.inventoryItem, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "variantId" })
  variant!: ProductVariant | null;

  @Column({ type: "int", default: 0 })
  available!: number;

  @Column({ type: "int", default: 0 })
  reserved!: number;

  @Column({ type: "int", default: 0 })
  sold!: number;

  @UpdateDateColumn()
  updatedAt!: Date;
}
