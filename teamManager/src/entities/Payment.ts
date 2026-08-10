import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { PlayerFee } from "./PlayerFee";
import { User } from "./User";

export type PaymentMethod = "CASH" | "TRANSFER" | "CHECK" | "OTHER";

/**
 * Payment Entity — versement enregistré sur une cotisation joueur
 * (`cms_player_fees`). Plusieurs versements possibles par cotisation
 * (règlement en plusieurs fois).
 */
@Entity("cms_payments")
export class Payment {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "player_fee_id" })
  playerFeeId!: number;

  @ManyToOne(() => PlayerFee, { onDelete: "CASCADE" })
  @JoinColumn({ name: "player_fee_id" })
  playerFee!: PlayerFee;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  amount!: string;

  @Column({ type: "enum", enum: ["CASH", "TRANSFER", "CHECK", "OTHER"], default: "CASH" })
  method!: PaymentMethod;

  @Column({ type: "datetime", name: "paid_at" })
  paidAt!: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  notes?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "recorded_by" })
  recordedBy?: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "recorded_by" })
  recorder?: User | null;
}
