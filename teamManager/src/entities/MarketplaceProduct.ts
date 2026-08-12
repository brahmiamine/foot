import "reflect-metadata";
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { MarketplaceProductStatus } from "./marketplaceEnums";
import { MarketplaceSeller } from "./MarketplaceSeller";

/**
 * Produit marketplace — mappée sur `sp_products` (sellerPortal, base
 * partagée `foot`). teamManager est le seul acteur autorisé à faire
 * transiter un produit SUBMITTED -> UNDER_REVIEW -> APPROVED/REJECTED ->
 * PUBLISHED (voir sellerPortal/src/entities/enums.ts,
 * SELLER_ALLOWED_PRODUCT_TRANSITIONS) : ce n'est pas une simple lecture
 * seule contrairement à MarketplaceSeller/MarketplaceProductCategory.
 *
 * Accès direct cross-DB assumé en l'absence de marketplace-api dédiée
 * (voir avancement.md, TS-04) — à migrer vers un appel HTTP le jour où
 * cette API existe.
 */
@Entity({ name: "sp_products" })
export class MarketplaceProduct {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 191 })
  @Index()
  sellerId!: string;

  @ManyToOne(() => MarketplaceSeller)
  @JoinColumn({ name: "sellerId" })
  seller!: MarketplaceSeller;

  @Column({ type: "varchar", length: 191 })
  name!: string;

  @Column({ type: "varchar", length: 191, nullable: true })
  categoryId!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  price!: string;

  @Column({ type: "enum", enum: MarketplaceProductStatus, default: MarketplaceProductStatus.DRAFT })
  status!: MarketplaceProductStatus;

  @Column({ type: "text", nullable: true })
  rejectionReason!: string | null;

  @Column({ type: "varchar", length: 191, nullable: true })
  reviewedBy!: string | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: "datetime" })
  createdAt!: Date;
}
