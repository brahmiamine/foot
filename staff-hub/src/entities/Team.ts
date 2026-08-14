import { Entity, PrimaryColumn, Column } from "typeorm";

/**
 * Copie en lecture seule de `teams` (référentiel géré dans federation-hub,
 * même base "foot"). Réduite aux champs utiles à player-hub (identité +
 * branding) — voir club-hub/src/entities/Team.ts pour la version complète.
 */
@Entity("teams")
export class Team {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 255 })
  nom!: string;

  @Column({ type: "varchar", length: 255, nullable: true, name: "nom_ar" })
  nomAr?: string | null;

  @Column({ type: "text", nullable: true, name: "logo_url" })
  logoUrl?: string | null;
}
