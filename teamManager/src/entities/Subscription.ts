import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { SubscriptionCategory } from "./SubscriptionCategory";
import { User } from "./User";

/**
 * Mappée sur `tk_subscriptions`, table possédée par `billetterie` (achat,
 * paiement, contrôle d'accès — voir db/OWNERSHIP.md). Lecture seule ici :
 * alimente uniquement le roster des abonnés du club dans l'admin
 * billetterie (voir /admin/billetterie/subscriptions). teamManager ne
 * modifie jamais cette table.
 */
@Entity("tk_subscriptions")
export class Subscription {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "char", length: 36, name: "subscription_category_id" })
  subscriptionCategoryId!: string;

  @ManyToOne(() => SubscriptionCategory)
  @JoinColumn({ name: "subscription_category_id" })
  category?: SubscriptionCategory;

  @Column({ type: "char", length: 36, name: "organizer_team_id" })
  organizerTeamId!: string;

  @Column({ type: "varchar", length: 191, name: "purchaser_id" })
  purchaserId!: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "purchaser_id" })
  purchaser?: User | null;

  @Column({ type: "enum", enum: ["PENDING", "PAID", "CANCELLED"] })
  status!: "PENDING" | "PAID" | "CANCELLED";

  @Column({ type: "varchar", length: 32 })
  reference!: string;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  price!: string;

  @Column({ type: "date", name: "valid_from" })
  validFrom!: Date;

  @Column({ type: "date", name: "valid_until" })
  validUntil!: Date;

  @Column({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @Column({ type: "date", name: "last_validated_on", nullable: true })
  lastValidatedOn!: Date | null;

  @Column({ type: "tinyint", default: 0 })
  revoked!: boolean;
}
