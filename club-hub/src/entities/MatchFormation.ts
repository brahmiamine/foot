import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Match } from "./Match";
import { FriendlyMatch } from "./FriendlyMatch";

export type MatchKind = "OFFICIAL" | "FRIENDLY";

/**
 * MatchFormation Entity — schéma tactique (ex: "4-3-3") et verrouillage de
 * la composition pour un match (officiel ou amical) de l'équipe du club
 * connecté. Un match terminé/annulé verrouille définitivement sa
 * composition (isLocked), appliqué par MatchFormationService.
 */
@Entity("cms_match_formations")
export class MatchFormation {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "enum", enum: ["OFFICIAL", "FRIENDLY"], default: "OFFICIAL", name: "match_type" })
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

  @Column({ type: "varchar", length: 20, default: "4-3-3" })
  formation!: string;

  @Column({ type: "tinyint", default: 0, name: "is_locked" })
  isLocked!: boolean;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
