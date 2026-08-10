import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Player } from "./Player";
import { PlayerEvaluation } from "./PlayerEvaluation";

export type PlayerObjectiveStatus = "IN_PROGRESS" | "ACHIEVED" | "MISSED";

/**
 * PlayerObjective Entity — objectif individuel fixé à un joueur (ex:
 * "améliorer la frappe du pied faible d'ici mars"), rattachable à une
 * évaluation d'origine. Table propre à cette app, scopée par team_id.
 */
@Entity("cms_player_objectives")
export class PlayerObjective {
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

  @Column({ type: "bigint", nullable: true, name: "evaluation_id" })
  evaluationId?: number | null;

  @ManyToOne(() => PlayerEvaluation, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "evaluation_id" })
  evaluation?: PlayerEvaluation | null;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  description?: string | null;

  @Column({ type: "date", nullable: true, name: "target_date" })
  targetDate?: string | null;

  @Column({ type: "enum", enum: ["IN_PROGRESS", "ACHIEVED", "MISSED"], default: "IN_PROGRESS" })
  status!: PlayerObjectiveStatus;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
