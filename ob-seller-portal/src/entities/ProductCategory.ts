import "reflect-metadata";
import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * Référentiel de catégories défini par l'OB (import/gestion depuis
 * teamManager dans une version ultérieure). Le vendeur choisit une catégorie
 * existante, il n'en crée pas.
 */
@Entity({ name: "sp_product_categories" })
export class ProductCategory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 191 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 191 })
  slug!: string;

  @Column({ type: "varchar", length: 191, nullable: true })
  parentId!: string | null;

  // Commission spécifique à la catégorie ; si null, la commission par
  // défaut du vendeur (Seller.commissionRate) s'applique.
  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  commissionRate!: string | null;
}
