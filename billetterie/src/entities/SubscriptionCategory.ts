import "reflect-metadata";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * Catégorie d'abonnement de saison définie par l'administration de chaque
 * club (ex: Or/Argent/Bronze) — table possédée par `teamManager` (voir
 * db/OWNERSHIP.md), lue ici en lecture seule pour la vente. `color` est le
 * seul champ de "design" (badge visuel sur la carte d'abonnement / l'écran
 * QR) ; pas de capacité/quota comme TicketCategory : un abonnement n'est
 * pas une place de stade rare vendue match par match.
 */
@Entity({ name: "tk_subscription_categories" })
@Index(["clubId", "slug"], { unique: true })
export class SubscriptionCategory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // FK logique vers teams.id — pas de contrainte FK réelle cross-connexion
  // TypeORM (comme TicketCategory.clubId).
  @Column({ type: "char", length: 36, name: "club_id" })
  clubId!: string;

  @Column({ type: "varchar", length: 191 })
  name!: string;

  @Column({ type: "varchar", length: 191 })
  slug!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  price!: string;

  @Column({ type: "varchar", length: 7, nullable: true })
  color!: string | null;

  @Column({ type: "date", name: "valid_from" })
  validFrom!: Date;

  @Column({ type: "date", name: "valid_until" })
  validUntil!: Date;

  @Column({ type: "tinyint", name: "is_active", default: 1 })
  isActive!: boolean;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
