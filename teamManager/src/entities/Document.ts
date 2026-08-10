import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";
import { User } from "./User";

export type DocumentEntityType = "PLAYER" | "STAFF" | "LICENSE" | "INJURY" | "GUARDIAN" | "TEAM" | "OTHER";
export type DocumentCategory = "IDENTITY" | "MEDICAL" | "LICENSE" | "INSURANCE" | "PARENTAL_CONSENT" | "CONTRACT" | "OTHER";

/**
 * Document Entity — document générique attaché à n'importe quelle entité du
 * club (joueur, staff, licence, blessure, parent...) via `entityType` +
 * `entityId`. Conçu polymorphe volontairement : pas de clé étrangère sur
 * `entityId` (plusieurs tables cibles possibles), l'intégrité est vérifiée
 * côté application. `expiresAt` alimente le tableau de bord d'échéances
 * (avec `cms_licenses.expires_at`, non dupliqué ici). Table propre à cette
 * app, scopée par team_id.
 */
@Entity("cms_documents")
export class Document {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "enum", enum: ["PLAYER", "STAFF", "LICENSE", "INJURY", "GUARDIAN", "TEAM", "OTHER"], name: "entity_type" })
  entityType!: DocumentEntityType;

  @Column({ type: "varchar", length: 191, name: "entity_id" })
  entityId!: string;

  @Column({
    type: "enum",
    enum: ["IDENTITY", "MEDICAL", "LICENSE", "INSURANCE", "PARENTAL_CONSENT", "CONTRACT", "OTHER"],
    default: "OTHER",
  })
  category!: DocumentCategory;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "varchar", length: 500, name: "file_url" })
  fileUrl!: string;

  @Column({ type: "date", nullable: true, name: "issued_at" })
  issuedAt?: string | null;

  @Column({ type: "date", nullable: true, name: "expires_at" })
  expiresAt?: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  notes?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "uploaded_by" })
  uploadedBy?: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "uploaded_by" })
  uploader?: User | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
