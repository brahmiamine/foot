import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Team } from "./Team";

/**
 * Media Item Entity
 * Table propre à cette app, scopée par team_id vers la table partagée `teams`.
 */
@Entity("cms_media_items")
export class MediaItem {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "bigint", nullable: true, name: "uploader_id" })
  uploaderId?: number | null;

  @Column({ type: "varchar", length: 255 })
  url!: string;

  @Column({
    type: "enum",
    enum: ["IMAGE", "VIDEO", "DOCUMENT", "AUDIO"],
    default: "IMAGE",
  })
  type!: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO";

  @Column({ type: "varchar", length: 100, nullable: true, name: "mime_type" })
  mimeType?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "alt_text_fr" })
  altTextFr?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "alt_text_ar" })
  altTextAr?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
