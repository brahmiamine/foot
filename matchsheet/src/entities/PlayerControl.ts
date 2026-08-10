import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Sheet } from "./Sheet";
import { MatchLineup } from "./MatchLineup";

/**
 * PlayerControl Entity — trace du contrôle d'identité / numéro de maillot
 * d'un joueur inscrit sur la feuille, effectué par l'arbitre avant le match
 * (écran "Contrôles" de la FMI). Une ligne par joueur de la composition.
 */
@Entity("ms_player_controls")
export class PlayerControl {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "sheet_id" })
  sheetId!: number;

  @ManyToOne(() => Sheet, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sheet_id" })
  sheet!: Sheet;

  @Column({ type: "bigint", name: "match_lineup_id" })
  matchLineupId!: number;

  @ManyToOne(() => MatchLineup, { onDelete: "CASCADE" })
  @JoinColumn({ name: "match_lineup_id" })
  matchLineup!: MatchLineup;

  @Column({ type: "tinyint", default: 0 })
  checked!: boolean;

  @Column({ type: "datetime", nullable: true, name: "checked_at" })
  checkedAt?: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  note?: string | null;
}
