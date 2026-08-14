import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm'

/**
 * Identité visuelle d'un club, résolue dynamiquement par les apps
 * génériques (club-hub, seller-portal, ticketing, ...) à partir du
 * teamId du contexte authentifié — jamais hardcodée. Une ligne par club,
 * optionnelle : en son absence, l'app consommatrice retombe sur un
 * branding par défaut neutre (voir README racine, section « Classification
 * des projets »).
 *
 * `name`/`shortName`/`logo` ne sont volontairement pas dupliqués ici :
 * `teams.nom`, `teams.abbr` et `teams.logo_url` (voir Team.ts) restent la
 * source de vérité pour ces champs.
 */
@Entity({ name: 'team_branding' })
export class TeamBranding {
  @PrimaryColumn({ type: 'char', length: 36, name: 'team_id' })
  teamId!: string

  @Column({ type: 'text', nullable: true, name: 'favicon_url' })
  faviconUrl?: string | null

  @Column({ type: 'text', nullable: true, name: 'icon_192_url' })
  icon192Url?: string | null

  @Column({ type: 'text', nullable: true, name: 'icon_512_url' })
  icon512Url?: string | null

  @Column({ type: 'varchar', length: 16, nullable: true, name: 'primary_color' })
  primaryColor?: string | null

  @Column({ type: 'varchar', length: 16, nullable: true, name: 'secondary_color' })
  secondaryColor?: string | null

  @Column({ type: 'varchar', length: 16, nullable: true, name: 'accent_color' })
  accentColor?: string | null

  @Column({ type: 'varchar', length: 191, nullable: true })
  font?: string | null

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown> | null

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: Date
}
