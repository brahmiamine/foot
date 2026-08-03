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

  /** Image PNG encodée en base64 (data URL) capturée depuis le pad de signature. */
  @Column({ type: "longtext", name: "signature_data" })
  signatureData!: string;

  @CreateDateColumn({ type: "datetime", name: "signed_at" })
  signedAt!: Date;
}
