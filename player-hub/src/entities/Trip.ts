import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type TripMatchKind = "OFFICIAL" | "FRIENDLY";

/** `cms_trips` (possédée par club-hub), lecture seule — voir club-hub/src/entities/Trip.ts. */
@Entity("cms_trips")
export class Trip {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 10, default: "seniors" })
  category!: string;

  @Column({ type: "enum", enum: ["OFFICIAL", "FRIENDLY"], nullable: true, name: "match_type" })
  matchType?: TripMatchKind | null;

  @Column({ type: "char", length: 36, nullable: true, name: "match_id" })
  matchId?: string | null;

  @Column({ type: "bigint", nullable: true, name: "friendly_match_id" })
  friendlyMatchId?: number | null;

  @Column({ type: "datetime", name: "departure_time" })
  departureTime!: Date;

  @Column({ type: "varchar", length: 255, nullable: true, name: "meeting_point" })
  meetingPoint?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
