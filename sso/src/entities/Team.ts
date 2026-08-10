import { Entity, PrimaryColumn, Column } from "typeorm";

/**
 * Mappée sur la table `teams` partagée. Lecture seule ici : juste de quoi
 * afficher le sélecteur de club sur l'écran de connexion.
 */
@Entity("teams")
export class Team {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 255, name: "nom" })
  nom!: string;

  @Column({ type: "varchar", length: 255, nullable: true, name: "nom_ar" })
  nomAr?: string | null;

  @Column({ type: "text", nullable: true, name: "logo_url" })
  logoUrl?: string | null;

  @Column({ type: "enum", enum: ["club", "national"], name: "team_type" })
  teamType!: "club" | "national";
}
