import "reflect-metadata";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * Un billet acheté. `organizerTeamId` est le club organisateur/vendeur
 * (l'équipe à domicile du match au moment de l'achat) — jamais celui du
 * supporter acheteur (`purchaserId`, un `User.id` sso de rôle MEMBER). Voir
 * README racine § « Billetterie : séparer l'identité du supporter de
 * l'organisateur de l'événement ».
 */
@Entity({ name: "tk_tickets" })
export class Ticket {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "match_id" })
  matchId!: string;

  @Column({ type: "char", length: 36, name: "match_ticket_category_id" })
  matchTicketCategoryId!: string;

  @Column({ type: "char", length: 36, name: "organizer_team_id" })
  organizerTeamId!: string;

  // User.id (sso, rôle MEMBER) — varchar(191) pour matcher sso/src/entities/User.ts.
  @Index()
  @Column({ type: "varchar", length: 191, name: "purchaser_id" })
  purchaserId!: string;

  @Column({
    type: "enum",
    enum: ["PENDING", "PAID", "CANCELLED", "USED"],
    default: "PENDING",
  })
  status!: "PENDING" | "PAID" | "CANCELLED" | "USED";

  @Index({ unique: true })
  @Column({ type: "varchar", length: 32 })
  reference!: string;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  price!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @Column({ type: "datetime", name: "paid_at", nullable: true })
  paidAt!: Date | null;

  @Column({ type: "datetime", name: "used_at", nullable: true })
  usedAt!: Date | null;

  /**
   * Payment.id de payment-api pour le paiement couvrant ce billet — tous
   * les billets d'un même achat (quantity > 1) partagent le même
   * payment_id, un seul paiement pour tout le panier. NULL tant que
   * l'appel POST /payments/konnect/init n'a pas réussi (voir
   * src/lib/tickets.ts, purchaseTickets) — un ticket sans payment_id qui
   * reste PENDING plus de quelques minutes signale un échec d'initiation,
   * pas un paiement en cours.
   */
  @Column({ type: "varchar", length: 36, name: "payment_id", nullable: true })
  paymentId!: string | null;
}
