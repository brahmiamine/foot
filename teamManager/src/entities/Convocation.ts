import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Match } from "./Match";
import { Player } from "./Player";

export type ConvocationResponse = "PENDING" | "PRESENT" | "ABSENT";

/**
 * Convocation Entity — joueur convoqué pour un match, avec suivi de sa
 * réponse (présent / absent). Table propre à cette app, scopée par team_id.
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

  @Column({ type: "char", length: 36, name: "match_id" })
  matchId!: string;

  @ManyToOne(() => Match, { onDelete: "CASCADE" })
  @JoinColumn({ name: "match_id" })
  match!: Match;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @ManyToOne(() => Player, { onDelete: "CASCADE" })
  @JoinColumn({ name: "player_id" })
  player!: Player;

  @Column({ type: "enum", enum: ["PENDING", "PRESENT", "ABSENT"], default: "PENDING" })
  response!: ConvocationResponse;

  @Column({ type: "varchar", length: 255, nullable: true })
  notes?: string | null;

  @Column({ type: "datetime", nullable: true, name: "notified_at" })
  notifiedAt?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "responded_at" })
  respondedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
