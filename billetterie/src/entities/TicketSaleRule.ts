import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export enum TicketSaleAudience {
  PUBLIC = "PUBLIC",
  HOME_SUPPORTERS = "HOME_SUPPORTERS",
  AWAY_SUPPORTERS = "AWAY_SUPPORTERS",
}

/**
 * Règle de vente d'une catégorie pour un match donné (ex. une tribune
 * réservée aux seuls supporters visiteurs). Décidée par le club
 * organisateur au moment de la configuration du match, jamais déduite du
 * club favori de l'acheteur (voir README racine, section « Billetterie »).
 * Une règle par match+catégorie ; en son absence, la vente est publique
 * sans restriction ni fenêtre (voir src/lib/tickets.ts).
 */
@Entity({ name: "tk_ticket_sale_rules" })
export class TicketSaleRule {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 36 })
  matchTicketCategoryId!: string;

  @Column({ type: "enum", enum: TicketSaleAudience, default: TicketSaleAudience.PUBLIC })
  allowedAudience!: TicketSaleAudience;

  @Column({ type: "int", default: 4 })
  maxTicketsPerUser!: number;

  @Column({ type: "datetime", nullable: true })
  startsAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  endsAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
