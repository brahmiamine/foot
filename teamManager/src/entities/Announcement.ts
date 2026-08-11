import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";

export type AnnouncementCategory = "DECISION" | "PROGRAMME" | "ADMINISTRATIF" | "RECRUTEMENT" | "SANCTION" | "ANNONCE";

/**
 * Announcement Entity — communiqué officiel du club (page /communiques) :
 * décisions, changements de programme, informations administratives,
 * recrutement, sanctions publiques, annonces officielles.
 */
@Entity("cms_announcements")
export class Announcement {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

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

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at", nullable: true })
  updatedAt?: Date | null;
}
