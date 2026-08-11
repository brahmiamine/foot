import { Entity, PrimaryColumn, Column } from "typeorm";

/**
 * Copie en lecture seule de `matches` (table partagée avec superadmin/
 * teamManager/matchsheet/ob). C'est l'« événement » de la billetterie —
 * volontairement pas de table Event séparée, voir README racine section
 * « Billetterie : séparer l'identité du supporter de l'organisateur de
 * l'événement ». `equipeHome` est le club organisateur par convention.
 */
@Entity("matches")
export class Match {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "char", length: 36, name: "equipe_home" })
  equipeHome!: string;

  @Column({ type: "char", length: 36, name: "equipe_away" })
  equipeAway!: string;

  @Column({ type: "datetime", nullable: true })
  date?: Date | null;

  @Column({
    type: "enum",
    enum: ["UPCOMING", "IN_PROGRESS", "FINISHED", "CANCELLED"],
    default: "UPCOMING",
  })
  status!: "UPCOMING" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";

  @Column({ type: "tinyint", name: "is_public_visible" })
  isPublicVisible!: boolean;
}
