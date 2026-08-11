import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

/** Mappée sur `cms_team_socials` (table teamManager), scopée par team_id. Lecture seule. */
@Entity("cms_team_socials")
export class TeamSocials {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

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
}
