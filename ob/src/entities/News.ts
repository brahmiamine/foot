import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

/** Mappée sur `cms_news` (table teamManager), scopée par team_id. Lecture seule. */
@Entity("cms_news")
export class News {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "longtext", name: "content_html" })
  contentHtml!: string;

  @Column({ type: "varchar", length: 255, nullable: true, name: "cover_image" })
  coverImage?: string | null;

  @Column({ type: "boolean", default: false, name: "is_published" })
  isPublished!: boolean;

  @Column({ type: "datetime", nullable: true, name: "published_at" })
  publishedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
