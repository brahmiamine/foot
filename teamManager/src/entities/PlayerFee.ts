import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Player } from "./Player";
import { FeePlan } from "./FeePlan";

export type PlayerFeeStatus = "PENDING" | "PARTIAL" | "PAID" | "WAIVED";

/**
 * PlayerFee Entity — cotisation assignée à un joueur (montant dû), réglée
 * en un ou plusieurs versements (`cms_payments`). `status` est recalculé
 * côté application (`FinanceService`) à partir de la somme des paiements,
 * jamais mis à jour manuellement en dehors de "WAIVED" (exonération).
 * Table propre à cette app, scopée par team_id.
 */
@Entity("cms_player_fees")
export class PlayerFee {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @ManyToOne(() => Player, { onDelete: "CASCADE" })
  @JoinColumn({ name: "player_id" })
  player!: Player;

  @Column({ type: "bigint", nullable: true, name: "fee_plan_id" })
  feePlanId?: number | null;

  @ManyToOne(() => FeePlan, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "fee_plan_id" })
  feePlan?: FeePlan | null;

  @Column({ type: "varchar", length: 150 })
  label!: string;

  @Column({ type: "decimal", precision: 10, scale: 3, name: "amount_due" })
  amountDue!: string;

  @Column({ type: "date", nullable: true, name: "due_date" })
  dueDate?: string | null;

  @Column({ type: "enum", enum: ["PENDING", "PARTIAL", "PAID", "WAIVED"], default: "PENDING" })
  status!: PlayerFeeStatus;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
