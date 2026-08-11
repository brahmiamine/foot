import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from "typeorm";

/**
 * Rattache une TicketCategory à un match précis, avec le prix et le quota
 * de ce match (une même catégorie peut avoir un prix différent selon
 * l'affiche). `soldCount` est incrémenté de façon transactionnelle à
 * l'achat (voir src/lib/tickets.ts) pour ne jamais dépasser `capacity`.
 */
@Entity({ name: "tk_match_ticket_categories" })
@Index(["matchId", "categoryId"], { unique: true })
export class MatchTicketCategory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // FK logique vers matches.id.
  @Column({ type: "varchar", length: 36 })
  matchId!: string;

  @Column({ type: "varchar", length: 36 })
  categoryId!: string;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  price!: string;

  @Column({ type: "int" })
  capacity!: number;

  @Column({ type: "int", default: 0 })
  soldCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
