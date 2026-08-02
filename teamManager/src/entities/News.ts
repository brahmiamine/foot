import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Team } from "./Team";

/**
 * News Entity
 * Table propre à cette app, scopée par team_id vers la table partagée `teams`.
 */
@Entity("cms_news")
export class News {
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

  @Column({ type: "varchar", length: 255, nullable: true, name: "cover_image" })
  coverImage?: string | null;

  @Column({ type: "bigint", nullable: true, name: "author_id" })
  authorId?: number | null;

  @Column({ type: "enum", enum: ["DRAFT", "PUBLISHED"], default: "DRAFT" })
  status!: "DRAFT" | "PUBLISHED";

  @Column({ type: "boolean", default: false, name: "is_published" })
  isPublished!: boolean;

  @Column({ type: "datetime", nullable: true, name: "published_at" })
  publishedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", nullable: true, name: "updated_at" })
  updatedAt?: Date | null;
}
