import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Sheet } from "./Sheet";

export type SignaturePhase = "PRE_MATCH" | "POST_MATCH";
export type ActorRole = "TEAM_HOME" | "TEAM_AWAY" | "REFEREE";

/**
 * Signature Entity — signature dessinée par l'un des trois acteurs (équipe
 * domicile, équipe extérieure, arbitre), avant et après le match.
 */
@Entity("ms_signatures")
export class Signature {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "sheet_id" })
  sheetId!: number;

  @ManyToOne(() => Sheet, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sheet_id" })
  sheet!: Sheet;

  @Column({ type: "enum", enum: ["PRE_MATCH", "POST_MATCH"] })
  phase!: SignaturePhase;

  @Column({ type: "enum", enum: ["TEAM_HOME", "TEAM_AWAY", "REFEREE"], name: "actor_role" })
  actorRole!: ActorRole;

  @Column({ type: "varchar", length: 191, nullable: true, name: "signer_name" })
  signerName?: string | null;

  /**
   * Image PNG encodée en base64 (data URL) capturée depuis le pad de
   * signature. `text` (limite MySQL ~64 Ko) plutôt que `longtext` : un
   * tracé de signature (trait noir simple) compresse largement sous cette
   * limite en pratique, et `longtext` n'est pas supporté par better-sqlite3
   * (utilisé par les tests, voir test/testDataSource.ts) — TASK-P0-024 a
   * ajouté `Signature` aux entités testées, ce qui a révélé
   * l'incompatibilité.
   */
  @Column({ type: "text", name: "signature_data" })
  signatureData!: string;

  @CreateDateColumn({ type: "datetime", name: "signed_at" })
  signedAt!: Date;

  // TASK-P0-024 : identité SSO authentifiée de l'opérateur ayant enregistré
  // cette signature (x-sso-user-id/x-sso-name, voir middleware.ts) — jamais
  // le signataire physique (domicile/extérieur/arbitre dessinent chacun sur
  // l'appareil de l'officiel du club recevant, aucune authentification
  // individuelle par acteur n'existe côté matchsheet). Traçabilité de
  // l'opérateur, pas preuve cryptographique d'identité du signataire —
  // limite documentée plutôt que simulée.
  @Column({ type: "varchar", length: 36, nullable: true, name: "recorded_by_user_id" })
  recordedByUserId?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "recorded_by_name" })
  recordedByName?: string | null;

  // SHA256 (hex) du contenu de la feuille (score, événements, effectifs) au
  // moment de la signature — voir computeSheetContentHash dans
  // SignatureService.ts. Permet de détecter après coup qu'un événement a
  // été ajouté/modifié APRÈS qu'un acteur a signé.
  @Column({ type: "char", length: 64, name: "content_hash" })
  contentHash!: string;
}
