import "reflect-metadata";
import { Entity, PrimaryColumn, Column } from "typeorm";

/**
 * Mappée sur la table `teams` partagée. Lecture seule ici : juste de quoi
 * afficher le club organisateur (nom/logo) sur les pages match/billet.
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
}
