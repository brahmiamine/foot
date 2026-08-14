import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

/**
 * Copie en lecture seule de `matches` (gérée par ArbiNote/cardManager) —
 * voir club-hub/src/entities/Match.ts. Relations retirées à dessein : les
 * entités de player-hub restent des colonnes plates, les jointures
 * (adversaire, journée...) sont résolues explicitement dans les services au
 * lieu de dépendre du graphe complet d'entités de club-hub.
 */
@Entity("matches")
export class Match {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "char", length: 36, name: "equipe_home" })
  equipeHome!: string;

  @Column({ type: "char", length: 36, name: "equipe_away" })
  equipeAway!: string;

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

  @CreateDateColumn({ type: "timestamp", name: "created_at" })
  createdAt!: Date;
}
