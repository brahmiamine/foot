import { Column, Entity, PrimaryColumn } from "typeorm";

export type PlayerContractType = "PROFESSIONAL" | "AMATEUR" | "TRAINEE" | "YOUTH" | "OTHER";
export type PlayerContractStatus = "DRAFT" | "SIGNED" | "TERMINATED" | "EXPIRED";
export type PlayerContractFederalStatus = "NOT_SUBMITTED" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";

/**
 * PLAYER-003 — lecture seule sur `player_contracts` (possédée par
 * club-hub/federation-hub, voir club-hub/src/entities/PlayerContract.ts).
 * Sous-ensemble restreint : ni rémunération (`salary`/`currency`/
 * `bonuses_json`), ni agent, ni document — seulement ce qu'il faut pour
 * afficher l'état du contrat au joueur.
 */
@Entity("player_contracts")
export class PlayerContract {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @Column({ type: "char", length: 36, name: "season_id" })
  seasonId!: string;

  @Column({ type: "enum", enum: ["PROFESSIONAL", "AMATEUR", "TRAINEE", "YOUTH", "OTHER"], name: "contract_type" })
  contractType!: PlayerContractType;

  @Column({ type: "date", name: "start_date" })
  startDate!: string;

  @Column({ type: "date", name: "end_date" })
  endDate!: string;

  @Column({ type: "enum", enum: ["DRAFT", "SIGNED", "TERMINATED", "EXPIRED"], default: "DRAFT" })
  status!: PlayerContractStatus;

  @Column({
    type: "enum",
    enum: ["NOT_SUBMITTED", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"],
    default: "NOT_SUBMITTED",
    name: "federation_status",
  })
  federationStatus!: PlayerContractFederalStatus;

  @Column({ type: "datetime", nullable: true, name: "signed_at" })
  signedAt?: Date | null;

  @Column({ type: "text", nullable: true, name: "rejection_reason" })
  rejectionReason?: string | null;

  @Column({ type: "text", nullable: true, name: "termination_reason" })
  terminationReason?: string | null;
}
