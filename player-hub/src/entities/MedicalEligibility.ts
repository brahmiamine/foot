import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

export type MedicalEligibilityStatus = "PENDING" | "FIT" | "UNFIT" | "EXPIRED" | "SUSPENDED";

/**
 * PLAYER-003 — lecture seule sur `medical_eligibilities` (possédée par
 * club-hub/federation-hub, voir club-hub/src/entities/MedicalEligibility.ts).
 * Ne jamais ajouter de champ diagnostic ici — migration-v2.md §3.3/§20 :
 * seul le statut d'aptitude (FIT/UNFIT/...) et sa date d'expiration sont
 * exposés, jamais `examination_date`/`validated_by_medical_user_id`/
 * `certificate_reference`/`document_url`/`created_by`. Le détail médical
 * reste dans cms_injuries, hors de player-hub (voir Injury.privacy.test.ts).
 * Frontière vérifiée par MedicalEligibility.privacy.test.ts.
 */
@Entity("medical_eligibilities")
export class MedicalEligibility {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @Column({ type: "char", length: 36, name: "season_id" })
  seasonId!: string;

  @Column({ type: "date", nullable: true, name: "expires_at" })
  expiresAt?: string | null;

  @Column({ type: "enum", enum: ["PENDING", "FIT", "UNFIT", "EXPIRED", "SUSPENDED"], default: "PENDING" })
  status!: MedicalEligibilityStatus;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
