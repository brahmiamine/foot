import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from "typeorm";

/**
 * Catégorie de billet définie par un club (ex. OB : Gradin/Chaise ; EST :
 * Virage/Tribune/VIP) — jamais un enum fixe dans le code, voir README
 * racine section « Billetterie ». Un club gère son propre référentiel de
 * catégories, réutilisable d'un match à l'autre via tk_match_ticket_categories.
 */
@Entity({ name: "tk_ticket_categories" })
@Index(["clubId", "slug"], { unique: true })
export class TicketCategory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // FK logique vers teams.id.
  @Column({ type: "varchar", length: 36 })
  clubId!: string;

  @Column({ type: "varchar", length: 191 })
  name!: string;

  @Column({ type: "varchar", length: 191 })
  slug!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  basePrice!: string;

  @Column({ type: "tinyint", default: 1 })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
