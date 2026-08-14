import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

export type FineType = "CARD" | "VIRAGE" | "DIRECTOR" | "DISCIPLINARY";
export type FineStatus = "PENDING" | "PAID" | "OVERDUE";

/** `Fine` (partagée avec cardManager), lecture seule — voir club-hub/src/entities/Fine.ts. */
@Entity("Fine")
export class Fine {
  @PrimaryColumn({ type: "varchar", length: 191 })
  id!: string;

  @Column({ type: "enum", enum: ["CARD", "VIRAGE", "DIRECTOR", "DISCIPLINARY"] })
  type!: FineType;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  amount!: string;

  @Column({ type: "varchar", length: 191 })
  reasonFr!: string;

  @Column({ type: "varchar", length: 191, nullable: true })
  playerId?: string | null;

  @Column({ type: "enum", enum: ["PENDING", "PAID", "OVERDUE"], default: "PENDING" })
  status!: FineStatus;

  @Column({ type: "datetime", precision: 3, nullable: true })
  paidAt?: Date | null;

  @Column({ type: "datetime", precision: 3, nullable: true })
  dueDate?: Date | null;

  @CreateDateColumn({ type: "datetime", precision: 3 })
  createdAt!: Date;
}
