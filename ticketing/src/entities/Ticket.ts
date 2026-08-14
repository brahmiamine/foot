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

  // User.id (sso, rôle MEMBER) — varchar(191) pour matcher identity/src/entities/User.ts.
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
   * Payment.id de payments pour le paiement couvrant ce billet — tous
   * les billets d'un même achat (quantity > 1) partagent le même
   * payment_id, un seul paiement pour tout le panier. NULL tant que
   * l'appel POST /payments/konnect/init n'a pas réussi (voir
   * src/lib/tickets.ts, purchaseTickets) — un ticket sans payment_id qui
   * reste PENDING plus de quelques minutes signale un échec d'initiation,
   * pas un paiement en cours.
   */
  @Column({ type: "varchar", length: 36, name: "payment_id", nullable: true })
  paymentId!: string | null;

  /**
   * Règle d'audience qui s'appliquait au moment de l'achat (PUBLIC si aucune
   * restriction). Trace ce que TicketSaleRule.allowedAudience valait alors —
   * jamais recalculée après coup, la règle peut changer entre-temps.
   */
  @Column({
    type: "enum",
    enum: ["PUBLIC", "HOME_SUPPORTERS", "AWAY_SUPPORTERS"],
    name: "declared_audience",
    default: "PUBLIC",
  })
  declaredAudience!: "PUBLIC" | "HOME_SUPPORTERS" | "AWAY_SUPPORTERS";

  /**
   * Signal de modération, jamais un blocage (voir TicketSaleRule pour
   * pourquoi une vérification stricte n'est pas possible ici) : vrai si
   * l'acheteur a déclaré HOME_SUPPORTERS/AWAY_SUPPORTERS mais que ses
   * affiliations sso ne couvrent pas l'équipe correspondante.
   */
  @Column({ type: "tinyint", name: "audience_mismatch", default: 0 })
  audienceMismatch!: boolean;

  /**
   * Révocation ciblée (TASK-P0-009) : distincte du cycle de vie normal
   * (`status`) — un billet PAID peut être révoqué (fraude détectée,
   * remboursement hors flux, litige...) sans que ça se confonde avec
   * CANCELLED (annulation avant paiement) ni USED. scanTicket() vérifie ce
   * champ en plus de `status` et rejette tout scan avec un motif dédié.
   */
  @Column({ type: "tinyint", name: "revoked", default: 0 })
  revoked!: boolean;

  @Column({ type: "datetime", name: "revoked_at", nullable: true })
  revokedAt!: Date | null;

  @Column({ type: "varchar", length: 255, name: "revoked_reason", nullable: true })
  revokedReason!: string | null;

  @Column({ type: "varchar", length: 191, name: "revoked_by", nullable: true })
  revokedBy!: string | null;
}
