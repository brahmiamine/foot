import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Match } from "./Match";
import { FriendlyMatch } from "./FriendlyMatch";
import { Player } from "./Player";

export type LineupRole = "STARTER" | "SUBSTITUTE";
export type MatchKind = "OFFICIAL" | "FRIENDLY";

/**
 * MatchLineup Entity — composition d'un match (titulaires / remplaçants)
 * pour l'équipe du club connecté, match officiel (table partagée `matches`)
 * ou amical (`cms_friendly_matches`, propre à teamManager) — jamais les
 * deux à la fois (matchType + contrainte CHECK en base). Consommée par le
 * projet "matchsheet" (feuille de match) pour les matchs officiels.
 * `posX`/`posY` (0-100, pourcentage du terrain) permettent le placement
 * libre par glisser-déposer sur le schéma tactique.
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

  @Column({ type: "char", length: 36, nullable: true, name: "match_id" })
  matchId?: string | null;

  @ManyToOne(() => Match, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "match_id" })
  match?: Match | null;

  @Column({ type: "enum", enum: ["OFFICIAL", "FRIENDLY"], default: "OFFICIAL", name: "match_type" })
  matchType!: MatchKind;

  @Column({ type: "bigint", nullable: true, name: "friendly_match_id" })
  friendlyMatchId?: number | null;

  @ManyToOne(() => FriendlyMatch, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "friendly_match_id" })
  friendlyMatch?: FriendlyMatch | null;

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

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true, name: "pos_x" })
  posX?: number | null;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true, name: "pos_y" })
  posY?: number | null;

  @Column({ type: "tinyint", default: 0, name: "is_captain" })
  isCaptain!: boolean;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
