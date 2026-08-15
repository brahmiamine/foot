import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Player } from "./Player";
import { Card } from "./Card";
import { Team } from "./Team";

export type SuspensionReason = "THREE_YELLOWS" | "CONSECUTIVE_YELLOWS" | "RED_CARD_1" | "RED_CARD_2" | "RED_CARD_3" | "DISCIPLINARY_DECISION";
export type SuspensionStatus = "ACTIVE" | "PURGED" | "CANCELLED";
export type DisciplinaryDecision = "CONFIRMED" | "MODIFIED" | "CANCELLED_BY_COMMISSION";

@Entity("Suspension")
export class Suspension {
  @PrimaryColumn({ type: "varchar", length: 191 }) id!: string;
  @Column({ type: "varchar", length: 191 }) playerId!: string;
  @ManyToOne(() => Player) @JoinColumn({ name: "playerId" }) player?: Player;
  @Column({ type: "varchar", length: 191, nullable: true }) cardId?: string | null;
  @ManyToOne(() => Card, { nullable: true }) @JoinColumn({ name: "cardId" }) card?: Card | null;
  @Column({ type: "enum", enum: ["THREE_YELLOWS", "CONSECUTIVE_YELLOWS", "RED_CARD_1", "RED_CARD_2", "RED_CARD_3", "DISCIPLINARY_DECISION"] }) reason!: SuspensionReason;
  @Column({ type: "int" }) matchesCount!: number;
  @Column({ type: "int", default: 0 }) matchesPurged!: number;
  @Column({ type: "enum", enum: ["ACTIVE", "PURGED", "CANCELLED"], default: "ACTIVE" }) status!: SuspensionStatus;
  @Column({ type: "varchar", length: 191, nullable: true }) startMatchId?: string | null;
  @CreateDateColumn({ type: "datetime", precision: 3 }) createdAt!: Date;
  @Column({ type: "varchar", length: 191, nullable: true }) teamId?: string | null;
  @ManyToOne(() => Team, { onDelete: "SET NULL" }) @JoinColumn({ name: "teamId" }) team?: Team | null;
  @Column({ type: "enum", enum: ["CONFIRMED", "MODIFIED", "CANCELLED_BY_COMMISSION"], default: "CONFIRMED" }) disciplinaryDecision!: DisciplinaryDecision;
  @Column({ type: "int", nullable: true }) overrideMatchesCount?: number | null;
  @Column({ type: "char", length: 36, nullable: true }) sourceDisciplinaryCaseId?: string | null;
  @Column({ type: "char", length: 36, nullable: true }) sourceDisciplinaryDecisionId?: string | null;
  @Column({ type: "text", nullable: true }) sourceReason?: string | null;
}
