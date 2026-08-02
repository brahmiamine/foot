import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

/**
 * Federation Entity
 * Mappée sur la table `federations` partagée avec ArbiNote et cardManager
 * (même base "foot", mêmes UUID). Lecture seule dans cette app : la gestion
 * du référentiel (créer/éditer une fédération) reste dans cardManager.
 */
@Entity("federations")
export class Federation {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 8 })
  code!: string;

  @Column({ type: "varchar", length: 255, name: "nom" })
  nom!: string;

  @Column({ type: "varchar", length: 255, nullable: true, name: "nom_en" })
  nomEn?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "nom_ar" })
  nomAr?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, name: "country_fr" })
  countryFr?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, name: "country_ar" })
  countryAr?: string | null;

  @Column({ type: "text", nullable: true })
  website?: string | null;

  @Column({ type: "text", nullable: true, name: "logo_url" })
  logoUrl?: string | null;

  @Column({ type: "tinyint", name: "is_active" })
  isActive!: boolean;

  @CreateDateColumn({ type: "timestamp", name: "created_at" })
  createdAt!: Date;
}
