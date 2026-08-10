import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Player } from "./Player";
import { User } from "./User";

export type InjurySeverity = "MINOR" | "MODERATE" | "SEVERE";
export type InjuryStatus = "ONGOING" | "RECOVERING" | "RESOLVED";
export type InjuryAvailability = "UNAVAILABLE" | "RECOVERY" | "PARTIAL" | "AVAILABLE";

/**
 * Injury Entity — dossier de blessure d'un joueur (zone, gravité,
 * diagnostic, indisponibilité, reprise). Module à accès strictement
 * restreint (permission "medical.*", voir lib/permissions.ts) : ni Coach ni
 * Adjoint n'y ont accès par défaut. Table propre à cette app, scopée par
 * team_id.
 */
@Entity("cms_injuries")
export class Injury {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @ManyToOne(() => Player, { onDelete: "CASCADE" })
  @JoinColumn({ name: "player_id" })
  player!: Player;

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

  /** Exploitée directement par EligibilityService (!= 'AVAILABLE' => indisponible). */
  @Column({ type: "enum", enum: ["UNAVAILABLE", "RECOVERY", "PARTIAL", "AVAILABLE"], default: "UNAVAILABLE", name: "availability_status" })
  availabilityStatus!: InjuryAvailability;

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "created_by" })
  createdBy?: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "created_by" })
  creator?: User | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", nullable: true, name: "updated_at" })
  updatedAt?: Date | null;
}
