import "reflect-metadata";
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Product } from "./Product";
import type { InventoryItem } from "./InventoryItem";

/**
 * Modèle générique de variante : `attributes` porte le ou les axes de
 * variation (Taille, Couleur, ...) sous forme libre pour ne pas figer le
 * schéma à un seul type d'attribut.
 * Exemple: { "Taille": "M" } ou { "Couleur": "Rouge", "Taille": "L" }.
 */
@Entity({ name: "sp_product_variants" })
export class ProductVariant {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 191 })
  productId!: string;

  @ManyToOne("Product", (p: Product) => p.variants, { onDelete: "CASCADE" })
  @JoinColumn({ name: "productId" })
  product!: Product;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 120 })
  sku!: string;

  @Column({ type: "json" })
  attributes!: Record<string, string>;

  // Si null, hérite du prix du produit parent.
  @Column({ type: "decimal", precision: 10, scale: 3, nullable: true })
  price!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  imageUrl!: string | null;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @OneToOne("InventoryItem", (i: InventoryItem) => i.variant)
  inventoryItem!: InventoryItem | null;
}
