import { Entity, PrimaryColumn, Column } from "typeorm";

/**
 * Copie en lecture seule de `teams` (référentiel géré dans superadmin, même
 * base "foot" partagée). Jamais d'écriture ici.
 */
@Entity("teams")
export class Team {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 255, name: "nom" })
  nom!: string;

  @Column({ type: "varchar", length: 16, nullable: true })
  abbr?: string | null;

  @Column({ type: "text", nullable: true, name: "logo_url" })
  logoUrl?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  stadium?: string | null;

  @Column({ type: "enum", enum: ["club", "national"], name: "team_type" })
  teamType!: "club" | "national";
}
