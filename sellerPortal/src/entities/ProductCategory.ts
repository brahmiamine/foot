import "reflect-metadata";
import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * Référentiel de catégories défini par l'administration du club (import/gestion depuis
 * teamManager dans une version ultérieure). Le vendeur choisit une catégorie
 * existante, il n'en crée pas.
 */
@Entity({ name: "sp_product_categories" })
@Index(["clubId", "slug"], { unique: true })
export class ProductCategory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // FK logique vers teams.id — catégories définies par l'administration de
  // chaque club, pas un référentiel global partagé entre tous les clubs.
  @Column({ type: "char", length: 36, name: "club_id" })
  clubId!: string;

  @Column({ type: "varchar", length: 191 })
  name!: string;

  @Column({ type: "varchar", length: 191 })
  slug!: string;

  @Column({ type: "varchar", length: 191, nullable: true })
  parentId!: string | null;

  // Commission spécifique à la catégorie ; si null, la commission par
  // défaut du vendeur (Seller.commissionRate) s'applique.
  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  commissionRate!: string | null;
}
