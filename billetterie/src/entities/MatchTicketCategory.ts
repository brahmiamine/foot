import "reflect-metadata";
import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * Quelle catégorie de billet est vendue pour quel match, à quel prix/quota
 * — le prix/quota d'une catégorie peut varier d'un match à l'autre (ex.
 * derby vs match ordinaire), donc jamais lu directement depuis
 * TicketCategory.basePrice pour une vente réelle.
 */
@Entity({ name: "tk_match_ticket_categories" })
@Index(["matchId", "categoryId"], { unique: true })
export class MatchTicketCategory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // FK logique vers matches.id (base partagée).
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
