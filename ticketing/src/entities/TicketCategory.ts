import "reflect-metadata";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * Catégorie de billet définie par l'administration de chaque club (ex. OB :
 * Gradin/Chaise ; EST : Virage/Tribune/VIP) — jamais un enum fixe dans le
 * code, voir README racine § « Billetterie ». Référentiel par club, pas
 * global (même principe que seller-portal/src/entities/ProductCategory.ts).
 */
@Entity({ name: "tk_ticket_categories" })
@Index(["clubId", "slug"], { unique: true })
export class TicketCategory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // FK logique vers teams.id — pas de contrainte FK réelle cross-connexion
  // TypeORM (comme seller-portal).
  @Column({ type: "char", length: 36, name: "club_id" })
  clubId!: string;

  @Column({ type: "varchar", length: 191 })
  name!: string;

  @Column({ type: "varchar", length: 191 })
  slug!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 3, name: "base_price" })
  basePrice!: string;

  @Column({ type: "tinyint", name: "is_active", default: 1 })
  isActive!: boolean;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
