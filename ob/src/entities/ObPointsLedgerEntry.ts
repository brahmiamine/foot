import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

/**
 * Barème repris du programme de fidélité (#28) : seuls les événements
 * listés là-bas créditent des points en phase 1. Poster/commenter n'en
 * rapporte pas (pas de valeur donnée dans la spec) — à revoir si le
 * programme de fidélité est étendu en phase 5.
 */
export type ObPointsReason = "SIGNUP" | "PREDICTION" | "PREDICTION_EXACT" | "VOTE";

@Entity("ob_points_ledger")
export class ObPointsLedgerEntry {
  @PrimaryGeneratedColumn({ type: "bigint" })
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
