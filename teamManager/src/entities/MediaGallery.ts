import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { MediaItem } from "./MediaItem";
import { Team } from "./Team";

/**
 * Media Gallery Entity
 * Table propre à cette app, scopée par team_id vers la table partagée `teams`.
 */
@Entity("cms_media_galleries")
export class MediaGallery {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 200, name: "title_fr" })
  titleFr!: string;

  @Column({ type: "varchar", length: 200, nullable: true, name: "title_ar" })
  titleAr?: string | null;

  @Column({ type: "text", nullable: true, name: "description_fr" })
  descriptionFr?: string | null;

  @Column({ type: "text", nullable: true, name: "description_ar" })
  descriptionAr?: string | null;

  @Column({ type: "bigint", nullable: true, name: "cover_image_id" })
  coverImageId?: number | null;

  @ManyToOne(() => MediaItem, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "cover_image_id" })
  coverImage?: MediaItem | null;

  @Column({ type: "boolean", default: true, name: "is_public" })
  isPublic!: boolean;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", nullable: true, name: "updated_at" })
  updatedAt?: Date | null;
}
