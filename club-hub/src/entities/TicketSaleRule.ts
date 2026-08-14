import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

/**
 * Restriction d'audience/quota par offre de billet (match+catégorie) —
 * table `tk_ticket_sale_rules`, partagée avec `ticketing`. Une seule
 * règle par `matchTicketCategoryId` dans cette admin (voir TicketingService,
 * upsert plutôt qu'un CRUD à plusieurs règles) : `ticketing` ne lit que
 * la première trouvée.
 *
 * ⚠️ `HOME_SUPPORTERS`/`AWAY_SUPPORTERS` n'est PAS vérifié via les
 * affiliations `sso` d'un membre — voir README racine § « Billetterie » et
 * ticketing/src/entities/TicketSaleRule.ts. Ne pas construire de logique
 * d'autorisation supplémentaire ici qui laisserait croire le contraire.
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

  @Column({ type: "int", name: "max_tickets_per_user", default: 4 })
  maxTicketsPerUser!: number;

  @Column({ type: "datetime", name: "starts_at", nullable: true })
  startsAt!: Date | null;

  @Column({ type: "datetime", name: "ends_at", nullable: true })
  endsAt!: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
