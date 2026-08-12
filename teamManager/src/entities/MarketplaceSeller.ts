import "reflect-metadata";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 * Vendeur marketplace — mappée sur `sp_sellers` (table de sellerPortal, base
 * partagée `foot`). Lecture seule côté teamManager : la gestion du compte
 * vendeur reste dans sellerPortal, ici on a juste besoin du nom pour le
 * filtre "vendeur" de la modération produits.
 */
@Entity({ name: "sp_sellers" })
export class MarketplaceSeller {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "club_id" })
  clubId!: string;

  @Column({ type: "varchar", length: 191 })
  businessName!: string;

  @Column({ type: "varchar", length: 191 })
  email!: string;
}
