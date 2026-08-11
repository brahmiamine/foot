import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export type FriendlyMatchStatus = "UPCOMING" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";

/** Mappée sur `cms_friendly_matches` (table teamManager). Lecture seule — juste de quoi afficher un match amical billeté. */
@Entity("cms_friendly_matches")
export class FriendlyMatch {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 200, nullable: true, name: "opponent_name" })
  opponentName?: string | null;

  @Column({ type: "tinyint", default: 1, name: "is_home" })
  isHome!: boolean;

  @Column({ type: "varchar", length: 200, nullable: true, name: "venue_name" })
  venueName?: string | null;

  @Column({ type: "datetime" })
  date!: Date;

  @Column({ type: "enum", enum: ["UPCOMING", "IN_PROGRESS", "FINISHED", "CANCELLED"], default: "UPCOMING" })
  status!: FriendlyMatchStatus;
}
