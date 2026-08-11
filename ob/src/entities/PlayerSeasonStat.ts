import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

/**
 * Mappée sur `cms_player_stats` (table teamManager, saisie/import staff).
 * Une ligne par match ou une ligne agrégée par saison selon la pratique du
 * club — on additionne systématiquement (voir PlayerStatsService), ce qui
 * donne le bon total dans les deux cas tant que le staff ne mélange pas les
 * deux formes pour une même saison. Lecture seule ici.
 */
@Entity("cms_player_stats")
export class PlayerSeasonStat {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id", collation: "utf8mb4_uca1400_ai_ci" })
  teamId!: string;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  season?: string | null;

  @Column({ type: "int", default: 0, name: "minutes_played" })
  minutesPlayed!: number;

  @Column({ type: "int", default: 0 })
  goals!: number;

  @Column({ type: "int", default: 0 })
  assists!: number;

  @Column({ type: "int", default: 0, name: "yellow_cards" })
  yellowCards!: number;

  @Column({ type: "int", default: 0, name: "red_cards" })
  redCards!: number;
}
