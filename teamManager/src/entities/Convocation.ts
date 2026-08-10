import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Match } from "./Match";
import { FriendlyMatch } from "./FriendlyMatch";
import { Player } from "./Player";

export type ConvocationResponse = "PENDING" | "PRESENT" | "ABSENT";
export type MatchKind = "OFFICIAL" | "FRIENDLY";

/**
 * Convocation Entity — joueur convoqué pour un match (officiel ou amical),
 * avec suivi de sa réponse (présent / absent). `lineupRole` reprend le rôle
 * (titulaire/remplaçant) au moment de l'envoi de la convocation, renseigné
 * quand elle est envoyée depuis la composition (MatchLineupService).
 * Table propre à cette app, scopée par team_id.
 */
@Entity("cms_convocations")
export class Convocation {
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

  @Column({ type: "enum", enum: ["PENDING", "PRESENT", "ABSENT"], default: "PENDING" })
  response!: ConvocationResponse;

  @Column({ type: "enum", enum: ["STARTER", "SUBSTITUTE"], nullable: true, name: "lineup_role" })
  lineupRole?: "STARTER" | "SUBSTITUTE" | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  notes?: string | null;

  @Column({ type: "datetime", nullable: true, name: "notified_at" })
  notifiedAt?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "responded_at" })
  respondedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
