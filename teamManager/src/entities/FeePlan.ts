import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Season } from "./Season";
import type { AgeCategory } from "@/types/categories";

/**
 * FeePlan Entity — modèle de cotisation du club (ex: "Cotisation annuelle
 * U17", 150 TND), servant de base à l'assignation aux joueurs
 * (`cms_player_fees`). Table propre à cette app, scopée par team_id.
 */
@Entity("cms_fee_plans")
export class FeePlan {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "bigint", nullable: true, name: "season_id" })
  seasonId?: number | null;

  @ManyToOne(() => Season, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "season_id" })
  season?: Season | null;

  @Column({ type: "varchar", length: 150 })
  name!: string;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  amount!: string;

  @Column({ type: "varchar", length: 10, nullable: true })
  category?: AgeCategory | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  description?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
