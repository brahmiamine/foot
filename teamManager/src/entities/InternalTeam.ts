import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Season } from "./Season";
import type { AgeCategory } from "@/types/categories";

export type InternalTeamStatus = "ACTIVE" | "ARCHIVED";

/**
 * InternalTeam Entity — équipe SPORTIVE INTERNE du club (ex: "U17 A",
 * "U17 B", "Seniors A"), à ne jamais confondre avec `teams` (référentiel de
 * clubs partagé avec ArbiNote/superadmin — 1 ligne = 1 club). Une catégorie
 * (`Player.category`) peut regrouper plusieurs équipes internes ; c'est
 * cette table qui les distingue. Table propre à cette app, scopée par
 * team_id, mappée `cms_teams` (nommée `InternalTeam` côté code pour éviter
 * toute confusion avec l'entité `Team`).
 */
@Entity("cms_teams")
export class InternalTeam {
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

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "varchar", length: 10, default: "seniors" })
  category!: AgeCategory;

  @Column({ type: "enum", enum: ["male", "female", "mixed"], default: "male" })
  gender!: "male" | "female" | "mixed";

  @Column({ type: "varchar", length: 20, nullable: true })
  code?: string | null;

  @Column({ type: "enum", enum: ["ACTIVE", "ARCHIVED"], default: "ACTIVE" })
  status!: InternalTeamStatus;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
