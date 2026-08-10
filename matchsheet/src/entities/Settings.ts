import { Entity, PrimaryColumn, Column, UpdateDateColumn } from "typeorm";

/**
 * Settings Entity — mappée sur la table `Settings` (une seule ligne),
 * partagée avec teamManager/cardManager. matchsheet n'en lit que les
 * montants d'amende/délai — la table est administrée depuis teamManager.
 */
@Entity("Settings")
export class Settings {
  @PrimaryColumn({ type: "varchar", length: 191 })
  id!: string;

  @Column({ type: "decimal", precision: 10, scale: 3, default: 30 })
  yellowFineAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 3, default: 50 })
  redFineAmount!: string;

  @Column({ type: "int", default: 15 })
  fineDueDays!: number;

  @UpdateDateColumn({ type: "datetime", precision: 3 })
  updatedAt!: Date;
}
