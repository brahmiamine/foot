import { Column, Entity, PrimaryColumn } from "typeorm";

export type PlayerRegistrationStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "SUSPENDED" | "CANCELLED";
export type PlayerEligibilityStatus = "ELIGIBLE" | "INELIGIBLE" | "PENDING";

/**
 * PLAYER-003 — lecture seule sur `player_registrations` (possédée par
 * club-hub/federation-hub, voir club-hub/src/entities/PlayerRegistration.ts).
 * Sous-ensemble restreint, sans identifiants d'acteur internes.
 */
@Entity("player_registrations")
export class PlayerRegistration {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @Column({ type: "char", length: 36, name: "season_id" })
  seasonId!: string;

  @Column({ type: "char", length: 36, name: "license_id" })
  licenseId!: string;

  @Column({ type: "datetime", nullable: true, name: "registered_at" })
  registeredAt?: Date | null;

  @Column({ type: "enum", enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "SUSPENDED", "CANCELLED"], default: "DRAFT" })
  status!: PlayerRegistrationStatus;

  @Column({ type: "enum", enum: ["ELIGIBLE", "INELIGIBLE", "PENDING"], default: "PENDING", name: "eligibility_status" })
  eligibilityStatus!: PlayerEligibilityStatus;

  @Column({ type: "text", nullable: true, name: "rejection_reason" })
  rejectionReason?: string | null;
}
