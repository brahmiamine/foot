import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export type InjurySeverity = "MINOR" | "MODERATE" | "SEVERE";
export type InjuryStatus = "ONGOING" | "RECOVERING" | "RESOLVED";

export interface InjuryDocument {
  name: string;
  url: string;
}

/**
 * `cms_injuries` (possédée par club-hub) — voir club-hub/src/entities/Injury.ts.
 * medical-hub est la SEULE app qui expose le dossier complet (diagnostic,
 * documents, notes) ; club-hub (module "medical.*") reste le propriétaire
 * de la donnée, player-hub/staff-hub n'en lisent qu'un statut simplifié
 * (disponible/blessé), jamais ces champs.
 */
@Entity("cms_injuries")
export class Injury {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @Column({ type: "date", name: "injury_date" })
  injuryDate!: string;

  @Column({ type: "varchar", length: 100 })
  zone!: string;

  @Column({ type: "enum", enum: ["MINOR", "MODERATE", "SEVERE"], default: "MINOR" })
  severity!: InjurySeverity;

  @Column({ type: "varchar", length: 500, nullable: true })
  description?: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  diagnosis?: string | null;

  @Column({ type: "int", nullable: true, name: "unavailability_days" })
  unavailabilityDays?: number | null;

  @Column({ type: "date", nullable: true, name: "expected_return_date" })
  expectedReturnDate?: string | null;

  @Column({ type: "date", nullable: true, name: "actual_return_date" })
  actualReturnDate?: string | null;

  @Column({ type: "tinyint", default: 0, name: "progressive_return" })
  progressiveReturn!: boolean;

  @Column({ type: "varchar", length: 500, nullable: true, name: "progressive_return_notes" })
  progressiveReturnNotes?: string | null;

  /** JSON: [{ name: string, url: string }] — documents médicaux uploadés. */
  @Column({ type: "text", nullable: true })
  documents?: string | null;

  @Column({ type: "enum", enum: ["ONGOING", "RECOVERING", "RESOLVED"], default: "ONGOING" })
  status!: InjuryStatus;

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "created_by" })
  createdBy?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", nullable: true, name: "updated_at" })
  updatedAt?: Date | null;
}
