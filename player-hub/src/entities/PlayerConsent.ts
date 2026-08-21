import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

export type PlayerConsentType = "CONTRACT" | "TRANSFER" | "LICENSE" | "IMAGE_RIGHTS" | "REGULATION";

/**
 * PLAYER-004 — `cms_player_consents` (possédée par club-hub). Append-only :
 * chaque signature est une nouvelle ligne, jamais une mutation — l'historique
 * est donc simplement la liste triée par date. player-hub y écrit
 * directement (consentement personnel du joueur, pas de workflow
 * d'approbation, même principe que PlayerAvailabilityDeclaration).
 */
@Entity("cms_player_consents")
export class PlayerConsent {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @Column({ type: "enum", enum: ["CONTRACT", "TRANSFER", "LICENSE", "IMAGE_RIGHTS", "REGULATION"], name: "consent_type" })
  consentType!: PlayerConsentType;

  @Column({ type: "varchar", length: 191, nullable: true, name: "reference_id" })
  referenceId?: string | null;

  @Column({ type: "datetime", name: "signed_at" })
  signedAt!: Date;

  @Column({ type: "varchar", length: 191, name: "signed_by_user_id" })
  signedByUserId!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
