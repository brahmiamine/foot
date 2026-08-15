import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

export type SuspensionReason = "THREE_YELLOWS" | "CONSECUTIVE_YELLOWS" | "RED_CARD_1" | "RED_CARD_2" | "RED_CARD_3" | "DISCIPLINARY_DECISION";
export type SuspensionStatus = "ACTIVE" | "PURGED" | "CANCELLED";

@Entity("Suspension")
export class Suspension {
  @PrimaryColumn({ type: "varchar", length: 191 }) id!: string;
  @Column({ type: "varchar", length: 191 }) playerId!: string;
  @Column({ type: "varchar", length: 191, nullable: true }) cardId?: string | null;
  @Column({ type: "enum", enum: ["THREE_YELLOWS", "CONSECUTIVE_YELLOWS", "RED_CARD_1", "RED_CARD_2", "RED_CARD_3", "DISCIPLINARY_DECISION"] }) reason!: SuspensionReason;
  @Column({ type: "int" }) matchesCount!: number;
  @Column({ type: "int", default: 0 }) matchesPurged!: number;
  @Column({ type: "enum", enum: ["ACTIVE", "PURGED", "CANCELLED"], default: "ACTIVE" }) status!: SuspensionStatus;
  @CreateDateColumn({ type: "datetime", precision: 3 }) createdAt!: Date;
  @Column({ type: "varchar", length: 191, nullable: true }) teamId?: string | null;
  @Column({ type: "char", length: 36, nullable: true }) sourceDisciplinaryCaseId?: string | null;
  @Column({ type: "char", length: 36, nullable: true }) sourceDisciplinaryDecisionId?: string | null;
  @Column({ type: "text", nullable: true }) sourceReason?: string | null;
}
