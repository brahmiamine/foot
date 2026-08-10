import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";

/**
 * TeamBranding Entity — identité & apparence du club dans teamManager
 * (module "Branding"), distincte du référentiel partagé `teams`
 * (ArbiNote/superadmin). Toutes les colonnes d'identité sont des
 * SURCHARGES optionnelles : nullable, avec repli sur `teams.nom`/
 * `teams.logoUrl` si absentes (voir lib/branding.ts, resolveBranding()).
 * UNIQUE(team_id) : un club = une seule configuration graphique. Seul
 * `User.role === "ADMIN"` (président du club) peut la modifier.
 */
@Entity("cms_team_branding")
export class TeamBranding {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id", unique: true })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 150, nullable: true, name: "display_name" })
  displayName?: string | null;

  @Column({ type: "varchar", length: 30, nullable: true, name: "short_name" })
  shortName?: string | null;

  @Column({ type: "varchar", length: 500, nullable: true, name: "logo_url" })
  logoUrl?: string | null;

  @Column({ type: "varchar", length: 500, nullable: true, name: "logo_dark_url" })
  logoDarkUrl?: string | null;

  @Column({ type: "varchar", length: 500, nullable: true, name: "favicon_url" })
  faviconUrl?: string | null;

  @Column({ type: "char", length: 7, name: "primary_color", default: "#556ee6" })
  primaryColor!: string;

  @Column({ type: "char", length: 7, name: "secondary_color", default: "#74788d" })
  secondaryColor!: string;

  @Column({ type: "char", length: 7, name: "accent_color", default: "#f1b44c" })
  accentColor!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", nullable: true, name: "updated_at" })
  updatedAt?: Date | null;
}
