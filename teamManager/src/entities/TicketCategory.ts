import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

/**
 * Catégorie de billet du club (Gradin/Chaise, Virage/Tribune/VIP, ...).
 * Table `tk_ticket_categories`, schéma créé dans billetterie/sql/schema.sql
 * (pas dupliqué ici) — partagée avec `billetterie`, qui la lit en lecture
 * seule pour l'achat. teamManager est l'admin : seule cette app écrit dans
 * tk_ticket_categories/tk_match_ticket_categories/tk_ticket_sale_rules,
 * `billetterie` n'écrit que tk_tickets (les billets achetés).
 */
@Entity({ name: "tk_ticket_categories" })
export class TicketCategory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "club_id" })
  clubId!: string;

  @Column({ type: "varchar", length: 191 })
  name!: string;

  @Column({ type: "varchar", length: 191 })
  slug!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 3, name: "base_price" })
  basePrice!: string;

  @Column({ type: "tinyint", name: "is_active", default: 1 })
  isActive!: boolean;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
