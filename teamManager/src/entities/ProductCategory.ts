import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";

/**
 * ProductCategory Entity — catégorie de produits de la boutique du club.
 * Table propre à cette app, scopée par team_id.
 */
@Entity("cms_product_categories")
export class ProductCategory {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 150, name: "name_fr" })
  nameFr!: string;

  @Column({ type: "varchar", length: 150, nullable: true, name: "name_ar" })
  nameAr?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
