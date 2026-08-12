import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

/** Mappée sur `cms_media_galleries` (table teamManager), scopée par team_id. Lecture seule. */
@Entity("cms_media_galleries")
export class MediaGallery {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 200, name: "title_fr" })
  titleFr!: string;
  @Column({ type: "varchar", length: 200, nullable: true, name: "title_ar" })
  titleAr?: string | null;

  @Column({ type: "boolean", default: true, name: "is_public" })
  isPublic!: boolean;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
