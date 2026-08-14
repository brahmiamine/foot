import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Matchday } from "./Matchday";

/**
 * Match Entity
 * Mappée sur la table `matches` partagée avec ArbiNote et cardManager (même
 * base "foot", mêmes UUID). Lecture (+ visibilité publique) uniquement dans
 * cette app : la création/édition d'un match reste dans ArbiNote/cardManager.
 */
@Entity("matches")
export class Match {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "char", length: 36, name: "journee_id" })
  journeeId!: string;

  @ManyToOne(() => Matchday, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "journee_id" })
  matchday?: Matchday;

  @Column({ type: "char", length: 36, name: "equipe_home" })
  equipeHome!: string;

  @ManyToOne(() => Team, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "equipe_home" })
  homeTeam?: Team;

  @Column({ type: "char", length: 36, name: "equipe_away" })
  equipeAway!: string;

  @ManyToOne(() => Team, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "equipe_away" })
  awayTeam?: Team;

  @Column({ type: "datetime", nullable: true })
  date?: Date | null;

  @Column({ type: "int", nullable: true, name: "score_home" })
  scoreHome?: number | null;

  @Column({ type: "int", nullable: true, name: "score_away" })
  scoreAway?: number | null;

  @Column({ type: "char", length: 36, nullable: true, name: "arbitre_id" })
  arbitreId?: string | null;

  @Column({
    type: "enum",
    enum: ["UPCOMING", "IN_PROGRESS", "FINISHED", "CANCELLED"],
    default: "UPCOMING",
  })
  status!: "UPCOMING" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";

  @Column({ type: "tinyint", name: "illegal_player_used" })
  illegalPlayerUsed!: boolean;

  @Column({ type: "tinyint", name: "is_public_visible" })
  isPublicVisible!: boolean;

  @CreateDateColumn({ type: "timestamp", name: "created_at" })
  createdAt!: Date;
}
