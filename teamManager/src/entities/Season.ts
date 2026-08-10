import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";

export type SeasonStatus = "PLANNED" | "ACTIVE" | "ARCHIVED";

/**
 * Season Entity — saison INTERNE du club (ex: "2026/2027"), contexte
 * temporel pour les équipes internes, l'effectif, les licences...
 * Indépendante de la table partagée `saisons` (saisons des compétitions
 * fédérales : championnat/coupe/tournois, gérées par ArbiNote/superadmin) —
 * un club a une seule saison sportive interne active à la fois même s'il
 * joue plusieurs compétitions fédérales en parallèle. Table propre à cette
 * app, scopée par team_id.
 */
@Entity("cms_seasons")
export class Season {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 50 })
  name!: string;

  @Column({ type: "date", nullable: true, name: "start_date" })
  startDate?: string | null;

  @Column({ type: "date", nullable: true, name: "end_date" })
  endDate?: string | null;

  @Column({ type: "enum", enum: ["PLANNED", "ACTIVE", "ARCHIVED"], default: "PLANNED" })
  status!: SeasonStatus;

  @Column({ type: "tinyint", default: 0, name: "is_current" })
  isCurrent!: boolean;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
