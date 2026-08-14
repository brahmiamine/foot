import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";
import { ProductCategory } from "./ProductCategory";

/**
 * Product Entity — article de la boutique du club (stock, prix, image).
 * Pas de commande/paiement en V1 : gestion pure du catalogue.
 * Table propre à cette app, scopée par team_id.
 */
@Entity("cms_products")
export class Product {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "bigint", nullable: true, name: "category_id" })
  categoryId?: number | null;

  @ManyToOne(() => ProductCategory, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "category_id" })
  category?: ProductCategory | null;

  @Column({ type: "varchar", length: 200, name: "name_fr" })
  nameFr!: string;

  @Column({ type: "varchar", length: 200, nullable: true, name: "name_ar" })
  nameAr?: string | null;

  @Column({ type: "text", nullable: true, name: "description_fr" })
  descriptionFr?: string | null;

  @Column({ type: "text", nullable: true, name: "description_ar" })
  descriptionAr?: string | null;

  @Column({ type: "decimal", precision: 10, scale: 3, default: 0 })
  price!: string;

  @Column({ type: "int", default: 0 })
  stock!: number;

  @Column({ type: "varchar", length: 255, nullable: true, name: "image_url" })
  imageUrl?: string | null;

  @Column({ type: "tinyint", default: 1, name: "is_active" })
  isActive!: boolean;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at", nullable: true })
  updatedAt?: Date | null;
}
