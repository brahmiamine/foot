import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Match } from "./Match";
import { FriendlyMatch } from "./FriendlyMatch";
import { Player } from "./Player";
import { User } from "./User";
import type { MatchKind } from "./MatchLineup";

export type MatchEventType =
  | "GOAL"
  | "OWN_GOAL"
  | "ASSIST"
  | "YELLOW_CARD"
  | "RED_CARD"
  | "SUBSTITUTION_IN"
  | "SUBSTITUTION_OUT"
  | "INJURY";

export type MatchEventSide = "HOME" | "AWAY";

/**
 * MatchEvent Entity — événement horodaté d'un match (but, but contre son
 * camp, passe décisive, carton, changement) pour un match officiel (table
 * partagée `matches`, lecture seule) ou amical (`cms_friendly_matches`),
 * jamais les deux à la fois (matchType + contrainte CHECK en base, même
 * convention que `MatchLineup`). `teamSide` indique quel côté du match
 * l'événement affecte (indispensable pour les buts adverses, sans joueur
 * de notre effectif). Base pour remplacer à terme la saisie manuelle de
 * `cms_player_stats`, qui reste utilisable en parallèle.
 */
@Entity("cms_match_events")
export class MatchEvent {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "enum", enum: ["OFFICIAL", "FRIENDLY"], name: "match_type" })
  matchType!: MatchKind;

  @Column({ type: "char", length: 36, nullable: true, name: "match_id" })
  matchId?: string | null;

  @ManyToOne(() => Match, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "match_id" })
  match?: Match | null;

  @Column({ type: "bigint", nullable: true, name: "friendly_match_id" })
  friendlyMatchId?: number | null;

  @ManyToOne(() => FriendlyMatch, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "friendly_match_id" })
  friendlyMatch?: FriendlyMatch | null;

  @Column({
    type: "enum",
    enum: ["GOAL", "OWN_GOAL", "ASSIST", "YELLOW_CARD", "RED_CARD", "SUBSTITUTION_IN", "SUBSTITUTION_OUT", "INJURY"],
    name: "event_type",
  })
  eventType!: MatchEventType;

  @Column({ type: "enum", enum: ["HOME", "AWAY"], name: "team_side" })
  teamSide!: MatchEventSide;

  @Column({ type: "varchar", length: 191, nullable: true, name: "player_id" })
  playerId?: string | null;

  @ManyToOne(() => Player, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "player_id" })
  player?: Player | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "related_player_id" })
  relatedPlayerId?: string | null;

  @ManyToOne(() => Player, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "related_player_id" })
  relatedPlayer?: Player | null;

  @Column({ type: "int", nullable: true })
  minute?: number | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  notes?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "created_by" })
  createdBy?: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "created_by" })
  creator?: User | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
