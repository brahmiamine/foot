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
import { ProductStatus } from "./enums";
import { Seller } from "./Seller";
import type { ProductVariant } from "./ProductVariant";
import type { ProductImage } from "./ProductImage";
import type { InventoryItem } from "./InventoryItem";

@Entity({ name: "sp_products" })
@Index(["sellerId", "status"])
export class Product {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 191 })
  sellerId!: string;

  @ManyToOne("Seller", (s: Seller) => s.products, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sellerId" })
  seller!: Seller;

  @Column({ type: "varchar", length: 191 })
  name!: string;

  @Column({ type: "varchar", length: 220 })
  slug!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  shortDescription!: string | null;

  @Column({ type: "varchar", length: 191, nullable: true })
  categoryId!: string | null;

  @Column({ type: "varchar", length: 191, nullable: true })
  brand!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 120 })
  sku!: string;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  price!: string;

  @Column({ type: "decimal", precision: 10, scale: 3, nullable: true })
  compareAtPrice!: string | null;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  taxRate!: string;

  @Column({ type: "decimal", precision: 8, scale: 3, nullable: true })
  weightKg!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  dimensions!: string | null;

  @Column({ type: "enum", enum: ProductStatus, default: ProductStatus.DRAFT })
  status!: ProductStatus;

  @Column({ type: "text", nullable: true })
  rejectionReason!: string | null;

  // Renseignés par club-hub lors d'une décision de modération (APPROVED
  // ou REJECTED) — voir sql/migration_add_moderation_fields.sql. reviewedBy
  // référence un User.id club-hub, pas un compte du Seller Portal.
  @Column({ type: "varchar", length: 191, nullable: true })
  reviewedBy!: string | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "datetime", nullable: true })
  deletedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany("ProductVariant", (v: ProductVariant) => v.product)
  variants!: ProductVariant[];

  @OneToMany("ProductImage", (i: ProductImage) => i.product)
  images!: ProductImage[];

  @OneToMany("InventoryItem", (i: InventoryItem) => i.product)
  inventoryItems!: InventoryItem[];
}
