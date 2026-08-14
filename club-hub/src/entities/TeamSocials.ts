import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";

/**
 * TeamSocials Entity — liens réseaux sociaux du club (footer/header du site
 * public). Un seul enregistrement par club.
 */
@Entity("cms_team_socials")
export class TeamSocials {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 255, nullable: true, name: "facebook_url" })
  facebookUrl?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "instagram_url" })
  instagramUrl?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "tiktok_url" })
  tiktokUrl?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "youtube_url" })
  youtubeUrl?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "x_url" })
  xUrl?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at", nullable: true })
  updatedAt?: Date | null;
}
