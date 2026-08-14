import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

/**
 * Quelle catégorie de billet est vendue pour quel match, à quel prix/quota
 * — table `tk_match_ticket_categories`, partagée avec `ticketing` (voir
 * TicketCategory.ts pour le partage de propriété d'écriture).
 */
@Entity({ name: "tk_match_ticket_categories" })
export class MatchTicketCategory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "match_id" })
  matchId!: string;

  @Column({ type: "char", length: 36, name: "category_id" })
  categoryId!: string;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  price!: string;

  @Column({ type: "int" })
  capacity!: number;

  @Column({ type: "int", name: "sold_count", default: 0 })
  soldCount!: number;
}
