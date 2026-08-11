import "reflect-metadata";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { PayoutStatus } from "./enums";

/**
 * Reversement au vendeur. Le calcul et le déclenchement réel des paiements
 * seront réalisés par le futur "Payment API" — cette table ne fait
 * qu'exposer un historique en lecture au vendeur, jamais de credentials de
 * provider de paiement.
 */
@Entity({ name: "sp_payouts" })
export class Payout {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 191 })
  sellerId!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 40 })
  reference!: string;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  amount!: string;

  @Column({ type: "enum", enum: PayoutStatus, default: PayoutStatus.PENDING })
  status!: PayoutStatus;

  @Column({ type: "date" })
  periodStart!: string;

  @Column({ type: "date" })
  periodEnd!: string;

  @Column({ type: "datetime", nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
