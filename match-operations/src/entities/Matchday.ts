import { Entity, PrimaryColumn, Column } from "typeorm";

/**
 * Matchday Entity — mappée sur la table `journees` (lecture seule ici).
 * Sert uniquement à afficher "J{number}" dans les listes/exports du module
 * discipline (cartons/notes) ; la gestion du calendrier reste dans ArbiNote.
 */
@Entity("journees")
export class Matchday {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "char", length: 36, name: "saison_id", nullable: true })
  seasonId?: string | null;

  @Column({ type: "int", name: "numero" })
  number!: number;
}
