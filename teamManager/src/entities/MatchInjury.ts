import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Match } from "./Match";
import { Team } from "./Team";
import { Player } from "./Player";
import type { MatchPeriod } from "./Card";

/**
 * Mappée sur `ms_injuries`, table possédée par `matchsheet` (blessure
 * constatée pendant le match, voir db/OWNERSHIP.md). Lecture seule — fil
 * des faits de match.
 *
 * Nommée `MatchInjury` (et non `Injury`) pour ne pas entrer en conflit avec
 * l'entité `Injury` déjà déclarée dans cette app (`cms_injuries`, le dossier
 * médical du joueur géré par le module santé) : ce sont deux concepts
 * distincts sur deux tables distinctes.
 */
@Entity("ms_injuries")
export class MatchInjury {
  @PrimaryColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "match_id" })
  matchId!: string;

  @ManyToOne(() => Match)
  @JoinColumn({ name: "match_id" })
  match?: Match;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team)
  @JoinColumn({ name: "team_id" })
  team?: Team;

  @Column({ type: "varchar", length: 191, nullable: true, name: "player_id" })
  playerId?: string | null;

  @ManyToOne(() => Player, { nullable: true })
  @JoinColumn({ name: "player_id" })
  player?: Player | null;

  @Column({ type: "int", nullable: true })
  minute?: number | null;

  @Column({ type: "enum", enum: ["H1", "H2", "ET1", "ET2"], nullable: true })
  period?: MatchPeriod | null;

  @Column({ type: "tinyint", default: 0, name: "requires_substitution" })
  requiresSubstitution!: boolean;

  /** Annulation sans suppression côté matchsheet — exclu du fil par défaut. */
  @Column({ type: "datetime", nullable: true, name: "cancelled_at" })
  cancelledAt?: Date | null;
}
