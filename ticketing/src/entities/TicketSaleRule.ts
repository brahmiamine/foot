import "reflect-metadata";
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 * Restriction d'audience/quota par match+catégorie. `allowedAudience`
 * distingue vente publique / réservée aux supporters du club à domicile /
 * réservée aux supporters du club visiteur — voir README racine § « Billetterie »
 * pour pourquoi ceci ne doit PAS être vérifié via les affiliations stockées
 * d'un MEMBER (sso `member_team_affiliations`) : un supporter peut suivre
 * plusieurs clubs ou aucun, ce n'est pas un mécanisme d'autorisation fiable.
 * HOME_SUPPORTERS/AWAY_SUPPORTERS reste donc, dans cette V1, une simple
 * auto-déclaration de l'acheteur au moment de l'achat (voir
 * POST /api/tickets) — pas une vérification d'identité.
 */
@Entity({ name: "tk_ticket_sale_rules" })
export class TicketSaleRule {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "match_ticket_category_id" })
  matchTicketCategoryId!: string;

  @Column({
    type: "enum",
    enum: ["PUBLIC", "HOME_SUPPORTERS", "AWAY_SUPPORTERS"],
    name: "allowed_audience",
    default: "PUBLIC",
  })
  allowedAudience!: "PUBLIC" | "HOME_SUPPORTERS" | "AWAY_SUPPORTERS";

  /**
   * US-38 : sans effet quand `allowedAudience` vaut `PUBLIC`. DECLARATIVE
   * (défaut, comportement historique) = auto-déclaration à l'achat, signal
   * de modération non bloquant après coup (voir Ticket.audienceMismatch).
   * STRICT = vérification bloquante des affiliations sso de l'acheteur
   * avant d'autoriser l'achat (voir purchaseTickets dans lib/tickets.ts).
   */
  @Column({
    type: "enum",
    enum: ["STRICT", "DECLARATIVE"],
    name: "audience_validation_mode",
    default: "DECLARATIVE",
  })
  audienceValidationMode!: "STRICT" | "DECLARATIVE";

  @Column({ type: "int", name: "max_tickets_per_user", default: 4 })
  maxTicketsPerUser!: number;

  @Column({ type: "datetime", name: "starts_at", nullable: true })
  startsAt!: Date | null;

  @Column({ type: "datetime", name: "ends_at", nullable: true })
  endsAt!: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
