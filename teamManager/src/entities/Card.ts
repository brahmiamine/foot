import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from "typeorm";
import { Player } from "./Player";
import { Match } from "./Match";
import { CardReason } from "./CardReason";

export type CardType = "YELLOW" | "RED" | "DOUBLE_YELLOW";
export type MatchPeriod = "H1" | "H2" | "ET1" | "ET2";

/**
 * Card Entity — mappée sur la table `Card`, partagée avec cardManager.
 * Un carton (jaune/rouge/double jaune) donné à un joueur lors d'un match.
 *
 * Deux écrivains (teamManager et matchsheet, voir db/OWNERSHIP.md) : la
 * contrainte UNIQUE ci-dessous (voir sql/migration_add_card_unique_constraint.sql)
 * est le filet de sécurité base contre une double insertion concurrente du
 * même carton, voir CardService.create (teamManager) et
 * CardEventService.create (matchsheet).
 */
@Entity("Card")
@Index("uq_card_player_match_type", ["playerId", "matchId", "type"], { unique: true })
export class Card {
  @PrimaryColumn({ type: "varchar", length: 191 })
  id!: string;

  @Column({ type: "varchar", length: 191 })
  playerId!: string;

  @ManyToOne(() => Player)
  @JoinColumn({ name: "playerId" })
  player?: Player;

  @Column({ type: "varchar", length: 191 })
  matchId!: string;

  @ManyToOne(() => Match)
  @JoinColumn({ name: "matchId" })
  match?: Match;

  @Column({ type: "enum", enum: ["YELLOW", "RED", "DOUBLE_YELLOW"] })
  type!: CardType;

  @Column({ type: "int", nullable: true })
  minute?: number | null;

  /** Temps de jeu (1ère/2e mi-temps, prolongations) — renseigné par l'app matchsheet. */
  @Column({ type: "enum", enum: ["H1", "H2", "ET1", "ET2"], nullable: true })
  period?: MatchPeriod | null;

  @Column({ type: "varchar", length: 191, nullable: true })
  cardReasonId?: string | null;

  @ManyToOne(() => CardReason, { onDelete: "SET NULL" })
  @JoinColumn({ name: "cardReasonId" })
  cardReason?: CardReason | null;

  @Column({ type: "varchar", length: 191, nullable: true })
  commentFr?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true })
  commentAr?: string | null;

  @CreateDateColumn({ type: "datetime", precision: 3 })
  createdAt!: Date;

  @Column({ type: "varchar", length: 191 })
  createdBy!: string;

  /** Neutralisé par un double jaune ou par la règle du cumul — n'est plus comptabilisé */
  @Column({ type: "tinyint", default: 0 })
  isNeutralized!: boolean;
}
