import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type InjurySeverity = "MINOR" | "MODERATE" | "SEVERE";
export type InjuryStatus = "ONGOING" | "RECOVERING" | "RESOLVED";

/**
 * `cms_injuries` (possédée par club-hub, module médical à accès restreint) —
 * voir club-hub/src/entities/Injury.ts. player-hub n'expose que le statut
 * de disponibilité dérivé de sa PROPRE blessure au joueur connecté (jamais
 * les dossiers d'un autre joueur) — voir services/PlayerPortalService et
 * app/disponibilite/page.tsx. Champ `documents` volontairement omis : rien
 * qui ressemble à un dossier médical complet n'a besoin de transiter ici,
 * un futur medical-hub reste le bon endroit pour ça.
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

  @Column({ type: "int", nullable: true, name: "unavailability_days" })
  unavailabilityDays?: number | null;

  @Column({ type: "date", nullable: true, name: "expected_return_date" })
  expectedReturnDate?: string | null;

  @Column({ type: "date", nullable: true, name: "actual_return_date" })
  actualReturnDate?: string | null;

  @Column({ type: "tinyint", default: 0, name: "progressive_return" })
  progressiveReturn!: boolean;

  @Column({ type: "enum", enum: ["ONGOING", "RECOVERING", "RESOLVED"], default: "ONGOING" })
  status!: InjuryStatus;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
