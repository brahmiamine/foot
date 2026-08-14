import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Federation } from "./Federation";

/**
 * Mappée sur `teams`, table partagée avec arbinote/club-hub/cardManager
 * (mêmes UUID). Lecture seule ici : une ligne = un club (ou une catégorie
 * d'âge d'un club) ; la gestion du référentiel reste dans cardManager.
 */
@Entity("teams")
export class Team {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "char", length: 36, nullable: true, name: "federation_id" })
  federationId?: string | null;

  @ManyToOne(() => Federation, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "federation_id" })
  federation?: Federation | null;

  @Column({ type: "varchar", length: 255, name: "nom" })
  nom!: string;
  @Column({ type: "varchar", length: 255, nullable: true, name: "nom_ar" })
  nomAr?: string | null;

  @Column({
    type: "enum",
    enum: ["football", "handball", "basketball", "volleyball"],
  })
  sport!: "football" | "handball" | "basketball" | "volleyball";

  @Column({ type: "varchar", length: 10, name: "age_category" })
  ageCategory!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  city?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  stadium?: string | null;

  @Column({ type: "text", nullable: true, name: "logo_url" })
  logoUrl?: string | null;
}
