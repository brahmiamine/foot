import { Entity, PrimaryColumn, Column, UpdateDateColumn } from "typeorm";

/**
 * Statistiques post-match (#22) saisies par le staff — rien d'équivalent
 * n'existe dans matchsheet/teamManager/arbinote (contrairement aux buts/
 * cartons/compositions, voir MsGoal/MatchCard/MatchLineup). Une ligne par
 * match, propriété exclusive de `ob`.
 */
@Entity("ob_match_stats")
export class ObMatchStats {
  @PrimaryColumn({ type: "char", length: 36, name: "match_id", collation: "utf8mb4_uca1400_ai_ci" })
  matchId!: string;

  @Column({ type: "int", nullable: true, name: "possession_home" })
  possessionHome?: number | null;

  @Column({ type: "int", nullable: true, name: "possession_away" })
  possessionAway?: number | null;

  @Column({ type: "int", nullable: true, name: "shots_home" })
  shotsHome?: number | null;

  @Column({ type: "int", nullable: true, name: "shots_away" })
  shotsAway?: number | null;

  @Column({ type: "int", nullable: true, name: "shots_on_target_home" })
  shotsOnTargetHome?: number | null;

  @Column({ type: "int", nullable: true, name: "shots_on_target_away" })
  shotsOnTargetAway?: number | null;

  @Column({ type: "int", nullable: true, name: "corners_home" })
  cornersHome?: number | null;

  @Column({ type: "int", nullable: true, name: "corners_away" })
  cornersAway?: number | null;

  @Column({ type: "int", nullable: true, name: "fouls_home" })
  foulsHome?: number | null;

  @Column({ type: "int", nullable: true, name: "fouls_away" })
  foulsAway?: number | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "updated_by" })
  updatedBy?: string | null;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
