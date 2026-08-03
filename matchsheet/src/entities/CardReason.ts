import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

/**
 * CardReason Entity — mappée sur la table `CardReason`, partagée avec
 * cardManager (motifs de carton, communs à tous les clubs).
 */
@Entity("CardReason")
export class CardReason {
  @PrimaryColumn({ type: "varchar", length: 191 })
  id!: string;

  @Column({ type: "varchar", length: 191 })
  labelFr!: string;

  @Column({ type: "varchar", length: 191, nullable: true })
  labelAr?: string | null;

  @Column({ type: "enum", enum: ["YELLOW", "RED", "BOTH"], default: "BOTH" })
  type!: "YELLOW" | "RED" | "BOTH";

  @Column({ type: "tinyint", default: 1 })
  isActive!: boolean;

  @CreateDateColumn({ type: "datetime", precision: 3 })
  createdAt!: Date;
}
