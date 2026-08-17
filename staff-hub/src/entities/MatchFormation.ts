import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from "typeorm";

export type FormationMatchKind = "OFFICIAL" | "FRIENDLY";
export type FormationWorkflowStatus = "DRAFT" | "PROPOSED" | "APPROVED" | "LOCKED";

/** `cms_match_formations` (possédée par club-hub) — miroir staff-hub du workflow de composition. */
@Entity("cms_match_formations")
export class MatchFormation {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "enum", enum: ["OFFICIAL", "FRIENDLY"], default: "OFFICIAL", name: "match_type" })
  matchType!: FormationMatchKind;

  @Column({ type: "char", length: 36, nullable: true, name: "match_id" })
  matchId?: string | null;

  @Column({ type: "bigint", nullable: true, name: "friendly_match_id" })
  friendlyMatchId?: number | null;

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
  workflowStatus!: FormationWorkflowStatus;

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
