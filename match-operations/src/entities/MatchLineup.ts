import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Match } from "./Match";
import { Player } from "./Player";

export type LineupRole = "STARTER" | "SUBSTITUTE";

/**
 * MatchLineup Entity — composition d'un match (titulaires / remplaçants)
 * pour l'équipe du club connecté. Consommée par le projet "match-operations"
 * (feuille de match) pour afficher la composition avant le coup d'envoi.
 * Table propre à cette app, scopée par team_id.
 */
@Entity("cms_match_lineups")
export class MatchLineup {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "char", length: 36, name: "match_id" })
  matchId!: string;

  @ManyToOne(() => Match, { onDelete: "CASCADE" })
  @JoinColumn({ name: "match_id" })
  match!: Match;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @ManyToOne(() => Player, { onDelete: "CASCADE" })
  @JoinColumn({ name: "player_id" })
  player!: Player;

  @Column({ type: "enum", enum: ["STARTER", "SUBSTITUTE"], default: "STARTER" })
  role!: LineupRole;

  @Column({ type: "int", nullable: true, name: "shirt_number" })
  shirtNumber?: number | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  position?: string | null;

  @Column({ type: "tinyint", default: 0, name: "is_captain" })
  isCaptain!: boolean;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
