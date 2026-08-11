import { Entity, PrimaryColumn, Column } from "typeorm";

/**
 * Copie en lecture seule de `team_branding` (gérée dans superadmin, voir
 * TeamBrandingPanel). teamManager ne fait que résoudre le branding du club
 * connecté (session.teamId) — jamais de logique spécifique à un club
 * hardcodée ici. Voir README racine, section « Classification des projets ».
 */
@Entity({ name: "team_branding" })
export class TeamBranding {
  @PrimaryColumn({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "text", nullable: true, name: "favicon_url" })
  faviconUrl?: string | null;

  @Column({ type: "varchar", length: 16, nullable: true, name: "primary_color" })
  primaryColor?: string | null;

  @Column({ type: "varchar", length: 16, nullable: true, name: "secondary_color" })
  secondaryColor?: string | null;

  @Column({ type: "varchar", length: 16, nullable: true, name: "accent_color" })
  accentColor?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true })
  font?: string | null;
}
