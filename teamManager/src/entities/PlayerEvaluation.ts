import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Player } from "./Player";
import { Season } from "./Season";
import { User } from "./User";

/**
 * PlayerEvaluation Entity — évaluation périodique d'un joueur (technique,
 * tactique, physique, mentale — notes sur 20) réalisée par un membre du
 * staff, pour le suivi de la progression des jeunes. Table propre à cette
 * app, scopée par team_id.
 */
@Entity("cms_player_evaluations")
export class PlayerEvaluation {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @ManyToOne(() => Player, { onDelete: "CASCADE" })
  @JoinColumn({ name: "player_id" })
  player!: Player;

  @Column({ type: "bigint", nullable: true, name: "season_id" })
  seasonId?: number | null;

  @ManyToOne(() => Season, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "season_id" })
  season?: Season | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "evaluator_id" })
  evaluatorId?: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "evaluator_id" })
  evaluator?: User | null;

  @Column({ type: "date", name: "evaluation_date" })
  evaluationDate!: string;

  @Column({ type: "tinyint", nullable: true, name: "technical_score" })
  technicalScore?: number | null;

  @Column({ type: "tinyint", nullable: true, name: "tactical_score" })
  tacticalScore?: number | null;

  @Column({ type: "tinyint", nullable: true, name: "physical_score" })
  physicalScore?: number | null;

  @Column({ type: "tinyint", nullable: true, name: "mental_score" })
  mentalScore?: number | null;

  @Column({ type: "varchar", length: 1000, nullable: true })
  comment?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
