import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, UpdateDateColumn } from "typeorm";
import { Federation } from "./Federation";

/**
 * Settings Entity — mappée sur la table `Settings`, partagée avec cardManager.
 * Réglages GLOBAUX (une seule ligne) : règles disciplinaires communes à tous
 * les clubs (mêmes seuils/montants FTF pour tout le monde).
 */
@Entity("Settings")
export class Settings {
  @PrimaryColumn({ type: "varchar", length: 191 })
  id!: string;

  @Column({ type: "int", default: 3 })
  yellowsBeforeSuspend!: number;

  @Column({ type: "int", default: 1 })
  redCard1Matches!: number;

  @Column({ type: "int", default: 2 })
  redCard2Matches!: number;

  @Column({ type: "int", default: 3 })
  redCard3Matches!: number;

  @Column({ type: "decimal", precision: 10, scale: 3, default: 30 })
  yellowFineAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 3, default: 50 })
  redFineAmount!: string;

  @Column({ type: "int", default: 15 })
  fineDueDays!: number;

  @Column({ type: "text" })
  alertEmails!: string;

  @Column({ type: "varchar", length: 191, default: "weekly" })
  cronFrequency!: string;

  @UpdateDateColumn({ type: "datetime", precision: 3 })
  updatedAt!: Date;

  @Column({ type: "char", length: 36, nullable: true })
  federationId?: string | null;

  @ManyToOne(() => Federation)
  @JoinColumn({ name: "federationId" })
  federation?: Federation | null;
}
