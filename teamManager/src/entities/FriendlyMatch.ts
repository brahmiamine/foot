import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Stadium } from "./Stadium";
import { User } from "./User";
import { Season } from "./Season";
import { Competition } from "./Competition";
import { CompetitionParticipant } from "./CompetitionParticipant";
import type { AgeCategory } from "@/types/categories";

export type FriendlyMatchStatus = "UPCOMING" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";

/**
 * FriendlyMatch Entity — match amical organisé par le club, en dehors du
 * calendrier officiel (table partagée `matches`, gérée par ArbiNote).
 * L'adversaire est soit un club du référentiel partagé `teams`
 * (opponentTeamId), soit un club créé à la volée (opponentName en texte
 * libre) ; le terrain est soit un stade du club (stadiumId), soit un lieu
 * libre (venueName). Table propre à cette app, scopée par team_id.
 */
@Entity("cms_friendly_matches")
export class FriendlyMatch {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 10, default: "seniors" })
  category!: AgeCategory;

  @Column({ type: "bigint", nullable: true, name: "season_id" })
  seasonId?: number | null;

  @ManyToOne(() => Season, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "season_id" })
  season?: Season | null;

  @Column({ type: "bigint", nullable: true, name: "competition_id" })
  competitionId?: number | null;

  @ManyToOne(() => Competition, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "competition_id" })
  competition?: Competition | null;

  @Column({ type: "bigint", nullable: true, name: "home_participant_id" })
  homeParticipantId?: number | null;

  @ManyToOne(() => CompetitionParticipant, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "home_participant_id" })
  homeParticipant?: CompetitionParticipant | null;

  @Column({ type: "bigint", nullable: true, name: "away_participant_id" })
  awayParticipantId?: number | null;

  @ManyToOne(() => CompetitionParticipant, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "away_participant_id" })
  awayParticipant?: CompetitionParticipant | null;

  @Column({ type: "char", length: 36, nullable: true, name: "opponent_team_id" })
  opponentTeamId?: string | null;

  @ManyToOne(() => Team, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "opponent_team_id" })
  opponentTeam?: Team | null;

  @Column({ type: "varchar", length: 200, nullable: true, name: "opponent_name" })
  opponentName?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "opponent_logo_url" })
  opponentLogoUrl?: string | null;

  @Column({ type: "tinyint", default: 1, name: "is_home" })
  isHome!: boolean;

  @Column({ type: "bigint", nullable: true, name: "stadium_id" })
  stadiumId?: number | null;

  @ManyToOne(() => Stadium, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "stadium_id" })
  stadium?: Stadium | null;

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

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "created_by" })
  createdBy?: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "created_by" })
  creator?: User | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", nullable: true, name: "updated_at" })
  updatedAt?: Date | null;
}
