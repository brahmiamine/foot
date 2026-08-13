import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

/**
 * SubscriptionCategory Entity — catégorie d'abonnement de saison définie
 * par le club (ex: Or/Argent/Bronze), mappée sur `tk_subscription_categories`
 * (table possédée par cette app, voir db/OWNERSHIP.md — même répartition
 * que TicketCategory/`tk_ticket_categories`, lue en lecture seule par
 * `billetterie`). `color` est le seul champ de "design" (badge visuel sur
 * la carte d'abonnement / l'écran QR du supporter). Pas de capacité/quota
 * comme les billets de match : un abonnement n'est pas une place de stade
 * rare, donc pas d'équivalent MatchTicketCategory/TicketSaleRule ici.
 */
@Entity("tk_subscription_categories")
@Index("uq_tk_subscription_categories_club_slug", ["clubId", "slug"], { unique: true })
export class SubscriptionCategory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

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

  /** Fenêtre de validité de saison, fixe pour tous les acheteurs — recopiée sur chaque abonnement à l'achat. */
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
