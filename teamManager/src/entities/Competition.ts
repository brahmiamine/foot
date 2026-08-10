import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Season } from "./Season";
import type { AgeCategory } from "@/types/categories";

export type CompetitionType = "TOURNAMENT" | "CUP" | "INTERNAL_LEAGUE" | "FRIENDLY_SERIES" | "OTHER";
export type CompetitionFormat = "LEAGUE" | "GROUPS" | "KNOCKOUT";
export type CompetitionStatus = "PLANNED" | "ACTIVE" | "FINISHED";

/**
 * Competition Entity — compétition organisée par le CLUB lui-même (tournoi
 * interne, coupe amicale, série de matchs groupés), indépendante du
 * calendrier fédéral partagé (`saisons`/`journees`/`ligues`/`matches`,
 * gérés par ArbiNote, non touchés). Les matchs qui la composent sont des
 * `cms_friendly_matches` rattachés via `competition_id`. Table propre à
 * cette app, scopée par team_id.
 */
@Entity("cms_competitions")
export class Competition {
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

  @Column({ type: "enum", enum: ["TOURNAMENT", "CUP", "INTERNAL_LEAGUE", "FRIENDLY_SERIES", "OTHER"], default: "TOURNAMENT" })
  type!: CompetitionType;

  @Column({ type: "varchar", length: 10, nullable: true })
  category?: AgeCategory | null;

  @Column({ type: "enum", enum: ["LEAGUE", "GROUPS", "KNOCKOUT"], default: "LEAGUE" })
  format!: CompetitionFormat;

  @Column({ type: "int", default: 3, name: "points_win" })
  pointsWin!: number;

  @Column({ type: "int", default: 1, name: "points_draw" })
  pointsDraw!: number;

  @Column({ type: "int", default: 0, name: "points_loss" })
  pointsLoss!: number;

  @Column({ type: "enum", enum: ["PLANNED", "ACTIVE", "FINISHED"], default: "PLANNED" })
  status!: CompetitionStatus;

  @Column({ type: "date", nullable: true, name: "start_date" })
  startDate?: string | null;

  @Column({ type: "date", nullable: true, name: "end_date" })
  endDate?: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  notes?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
