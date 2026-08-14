import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Team } from "./Team";

/**
 * Mappée sur `matches`, table partagée avec ArbiNote et cardManager (mêmes
 * UUID). Lecture seule ici, filtrée par `isPublicVisible` : la création/
 * édition d'un match reste dans ArbiNote/cardManager.
 */
@Entity("matches")
export class Match {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

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

  @Column({
    type: "enum",
    enum: ["UPCOMING", "IN_PROGRESS", "FINISHED", "CANCELLED"],
    default: "UPCOMING",
  })
  status!: "UPCOMING" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";

  @Column({ type: "tinyint", name: "is_public_visible" })
  isPublicVisible!: boolean;
}
