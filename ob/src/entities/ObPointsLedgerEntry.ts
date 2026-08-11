import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

/**
 * Barème repris du programme de fidélité "OB Fan Rewards" (#28). Poster/
 * commenter ne rapporte pas de points (pas de valeur donnée dans la spec).
 * "Achat boutique" (+100) n'est pas encore dans cette liste : la boutique
 * n'a pas de paiement branché (phase 4, en attente de Stripe).
 */
export type ObPointsReason = "SIGNUP" | "PREDICTION" | "PREDICTION_EXACT" | "VOTE" | "QUIZ" | "CHECKIN";

@Entity("ob_points_ledger")
export class ObPointsLedgerEntry {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "int" })
  points!: number;

  @Column({ type: "varchar", length: 64 })
  reason!: ObPointsReason;

  @Column({ type: "varchar", length: 32, nullable: true, name: "ref_type" })
  refType?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "ref_id" })
  refId?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
