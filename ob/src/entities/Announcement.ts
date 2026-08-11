import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export type AnnouncementCategory = "DECISION" | "PROGRAMME" | "ADMINISTRATIF" | "RECRUTEMENT" | "SANCTION" | "ANNONCE";

/** Mappée sur `cms_announcements` (table teamManager), scopée par team_id. Lecture seule. */
@Entity("cms_announcements")
export class Announcement {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "longtext", name: "content_html" })
  contentHtml!: string;

  @Column({ type: "enum", enum: ["DECISION", "PROGRAMME", "ADMINISTRATIF", "RECRUTEMENT", "SANCTION", "ANNONCE"], default: "ANNONCE" })
  category!: AnnouncementCategory;

  @Column({ type: "boolean", default: false, name: "is_published" })
  isPublished!: boolean;

  @Column({ type: "datetime", nullable: true, name: "published_at" })
  publishedAt?: Date | null;
}
