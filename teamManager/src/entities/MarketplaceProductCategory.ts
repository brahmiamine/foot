import "reflect-metadata";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 * Catégorie marketplace — mappée sur `sp_product_categories` (sellerPortal).
 * Lecture seule côté teamManager, pour le filtre "catégorie" de la
 * modération produits.
 */
@Entity({ name: "sp_product_categories" })
export class MarketplaceProductCategory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "club_id" })
  clubId!: string;

  @Column({ type: "varchar", length: 191 })
  name!: string;
}
