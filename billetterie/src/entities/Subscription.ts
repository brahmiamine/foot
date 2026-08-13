import "reflect-metadata";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * Un abonnement de saison acheté. Contrairement à `Ticket`, jamais de
 * statut "USED" : le produit reste valide pour de multiples validations
 * pendant toute sa fenêtre `valid_from`/`valid_until` — voir
 * `last_validated_on` et `scanSubscription` (src/lib/subscriptions.ts) pour
 * la garde "une validation par jour".
 */
@Entity({ name: "tk_subscriptions" })
export class Subscription {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "subscription_category_id" })
  subscriptionCategoryId!: string;

  @Column({ type: "char", length: 36, name: "organizer_team_id" })
  organizerTeamId!: string;

  // User.id (sso, rôle MEMBER) — varchar(191) pour matcher sso/src/entities/User.ts.
  @Index()
  @Column({ type: "varchar", length: 191, name: "purchaser_id" })
  purchaserId!: string;

  @Column({
    type: "enum",
    enum: ["PENDING", "PAID", "CANCELLED"],
    default: "PENDING",
  })
  status!: "PENDING" | "PAID" | "CANCELLED";

  @Index({ unique: true })
  @Column({ type: "varchar", length: 32 })
  reference!: string;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  price!: string;

  /** Recopiés depuis SubscriptionCategory au moment de l'achat — voir l'entité pour pourquoi. */
  @Column({ type: "date", name: "valid_from" })
  validFrom!: Date;

  @Column({ type: "date", name: "valid_until" })
  validUntil!: Date;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @Column({ type: "datetime", name: "paid_at", nullable: true })
  paidAt!: Date | null;

  @Column({ type: "varchar", length: 36, name: "payment_id", nullable: true })
  paymentId!: string | null;

  /** Date (jour) de la dernière validation réussie — voir scanSubscription, la garde "une fois par jour". */
  @Column({ type: "date", name: "last_validated_on", nullable: true })
  lastValidatedOn!: Date | null;

  /** Révocation ciblée — même sémantique que Ticket.revoked. */
  @Column({ type: "tinyint", name: "revoked", default: 0 })
  revoked!: boolean;

  @Column({ type: "datetime", name: "revoked_at", nullable: true })
  revokedAt!: Date | null;

  @Column({ type: "varchar", length: 255, name: "revoked_reason", nullable: true })
  revokedReason!: string | null;

  @Column({ type: "varchar", length: 191, name: "revoked_by", nullable: true })
  revokedBy!: string | null;
}
