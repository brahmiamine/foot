import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type FriendlyMatchStatus = "UPCOMING" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";

/**
 * Copie en lecture seule de `cms_friendly_matches` (possédée par club-hub) —
 * voir club-hub/src/entities/FriendlyMatch.ts.
 */
@Entity("cms_friendly_matches")
export class FriendlyMatch {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 10, default: "seniors" })
  category!: string;

  @Column({ type: "varchar", length: 200, nullable: true, name: "opponent_name" })
  opponentName?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "opponent_logo_url" })
  opponentLogoUrl?: string | null;

  @Column({ type: "tinyint", default: 1, name: "is_home" })
  isHome!: boolean;

  @Column({ type: "varchar", length: 200, nullable: true, name: "venue_name" })
  venueName?: string | null;

  @Column({ type: "datetime" })
  date!: Date;

  @Column({ type: "int", nullable: true, name: "score_home" })
  scoreHome?: number | null;

  @Column({ type: "int", nullable: true, name: "score_away" })
  scoreAway?: number | null;

  @Column({ type: "enum", enum: ["UPCOMING", "IN_PROGRESS", "FINISHED", "CANCELLED"], default: "UPCOMING" })
  status!: FriendlyMatchStatus;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
