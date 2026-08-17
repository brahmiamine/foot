import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Match } from "./Match";
import { FriendlyMatch } from "./FriendlyMatch";

export type MatchKind = "OFFICIAL" | "FRIENDLY";
export type MatchFormationWorkflowStatus = "DRAFT" | "PROPOSED" | "APPROVED" | "LOCKED";

/**
 * MatchFormation Entity — schéma tactique (ex: "4-3-3"), workflow
 * proposition/approbation et verrouillage de la composition pour un match.
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

  @Column({
    type: "enum",
    enum: ["DRAFT", "PROPOSED", "APPROVED", "LOCKED"],
    default: "DRAFT",
    name: "workflow_status",
  })
  workflowStatus!: MatchFormationWorkflowStatus;

  @Column({ type: "varchar", length: 191, nullable: true, name: "proposed_by" })
  proposedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "proposed_at" })
  proposedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "approved_by" })
  approvedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "approved_at" })
  approvedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "locked_by" })
  lockedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "locked_at" })
  lockedAt?: Date | null;

  @Column({ type: "int", default: 1, name: "workflow_version" })
  workflowVersion!: number;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
