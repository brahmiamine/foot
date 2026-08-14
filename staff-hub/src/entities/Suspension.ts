import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

export type SuspensionReason = "THREE_YELLOWS" | "CONSECUTIVE_YELLOWS" | "RED_CARD_1" | "RED_CARD_2" | "RED_CARD_3";
export type SuspensionStatus = "ACTIVE" | "PURGED" | "CANCELLED";

/** `Suspension` (partagée avec cardManager), lecture seule — voir club-hub/src/entities/Suspension.ts. */
@Entity("Suspension")
export class Suspension {
  @PrimaryColumn({ type: "varchar", length: 191 })
  id!: string;

  @Column({ type: "varchar", length: 191 })
  playerId!: string;

  @Column({ type: "varchar", length: 191 })
  cardId!: string;

  @Column({ type: "enum", enum: ["THREE_YELLOWS", "CONSECUTIVE_YELLOWS", "RED_CARD_1", "RED_CARD_2", "RED_CARD_3"] })
  reason!: SuspensionReason;

  @Column({ type: "int" })
  matchesCount!: number;

  @Column({ type: "int", default: 0 })
  matchesPurged!: number;

  @Column({ type: "enum", enum: ["ACTIVE", "PURGED", "CANCELLED"], default: "ACTIVE" })
  status!: SuspensionStatus;

  @CreateDateColumn({ type: "datetime", precision: 3 })
  createdAt!: Date;

  @Column({ type: "varchar", length: 191, nullable: true })
  teamId?: string | null;
}
