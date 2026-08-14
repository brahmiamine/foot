import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

export type CardType = "YELLOW" | "RED" | "DOUBLE_YELLOW";
export type MatchPeriod = "H1" | "H2" | "ET1" | "ET2";

/** `Card` (partagée avec cardManager/match-operations), lecture seule — voir club-hub/src/entities/Card.ts. */
@Entity("Card")
export class Card {
  @PrimaryColumn({ type: "varchar", length: 191 })
  id!: string;

  @Column({ type: "varchar", length: 191 })
  playerId!: string;

  @Column({ type: "varchar", length: 191 })
  matchId!: string;

  @Column({ type: "enum", enum: ["YELLOW", "RED", "DOUBLE_YELLOW"] })
  type!: CardType;

  @Column({ type: "int", nullable: true })
  minute?: number | null;

  @Column({ type: "enum", enum: ["H1", "H2", "ET1", "ET2"], nullable: true })
  period?: MatchPeriod | null;

  @Column({ type: "varchar", length: 191, nullable: true })
  commentFr?: string | null;

  @CreateDateColumn({ type: "datetime", precision: 3 })
  createdAt!: Date;

  @Column({ type: "tinyint", default: 0 })
  isNeutralized!: boolean;
}
