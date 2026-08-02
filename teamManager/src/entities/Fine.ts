import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Player } from "./Player";
import { Card } from "./Card";
import { Team } from "./Team";

export type FineType = "CARD" | "VIRAGE" | "DIRECTOR" | "DISCIPLINARY";
export type FineStatus = "PENDING" | "PAID" | "OVERDUE";

/**
 * Fine Entity — mappée sur la table `Fine`, partagée avec cardManager.
 * Amende disciplinaire (dérivée d'un carton, ou saisie directement pour un
 * incident de virage / dirigeant / commission).
 */
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
  reasonAr?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true })
  playerId?: string | null;

  @ManyToOne(() => Player, { onDelete: "SET NULL" })
  @JoinColumn({ name: "playerId" })
  player?: Player | null;

  @Column({ type: "varchar", length: 191, nullable: true })
  cardId?: string | null;

  @ManyToOne(() => Card, { onDelete: "SET NULL" })
  @JoinColumn({ name: "cardId" })
  card?: Card | null;

  @Column({ type: "varchar", length: 191, nullable: true })
  directorNameFr?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true })
  directorNameAr?: string | null;

  @Column({ type: "enum", enum: ["PENDING", "PAID", "OVERDUE"], default: "PENDING" })
  status!: FineStatus;

  @Column({ type: "datetime", precision: 3, nullable: true })
  paidAt?: Date | null;

  @Column({ type: "datetime", precision: 3, nullable: true })
  dueDate?: Date | null;

  @CreateDateColumn({ type: "datetime", precision: 3 })
  createdAt!: Date;

  /** Équipe concernée — dérivée du joueur pour les amendes carton, saisie
   * explicitement pour VIRAGE/DIRECTOR/DISCIPLINARY. */
  @Column({ type: "varchar", length: 191, nullable: true })
  teamId?: string | null;

  @ManyToOne(() => Team)
  @JoinColumn({ name: "teamId" })
  team?: Team | null;
}
