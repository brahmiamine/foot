import { Entity, PrimaryColumn, Column } from "typeorm";

/**
 * Mappée sur `federations`, table partagée avec arbinote/teamManager/cardManager.
 * Lecture seule ici : sert à regrouper les équipes d'une même compétition
 * pour calculer le classement (voir PublicStandingsService).
 */
@Entity("federations")
export class Federation {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 255, name: "nom" })
  nom!: string;
}
