import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from "typeorm";

export type FormationMatchKind = "OFFICIAL" | "FRIENDLY";

/** `cms_match_formations` (possédée par club-hub) — voir club-hub/src/entities/MatchFormation.ts. */
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

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
