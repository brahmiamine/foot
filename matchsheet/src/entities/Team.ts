import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Federation } from "./Federation";

/**
 * Team Entity
 * Mappée sur la table `teams` partagée avec ArbiNote et cardManager (même base
 * "foot", mêmes UUID). Une ligne = un club (ou une catégorie d'âge d'un
 * club). Cette app CMS lit toujours sa propre ligne via TEAM_ID ; la gestion
 * complète du référentiel (créer/éditer une équipe) reste dans cardManager.
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

  @Column({ type: "varchar", length: 16, nullable: true })
  abbr?: string | null;

  @Column({ type: "varchar", length: 255, name: "nom" })
  nom!: string;

  @Column({ type: "varchar", length: 255, nullable: true, name: "nom_en" })
  nomEn?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "nom_ar" })
  nomAr?: string | null;

  @Column({ type: "enum", enum: ["club", "national"], name: "team_type" })
  teamType!: "club" | "national";

  @Column({ type: "varchar", length: 3, nullable: true, name: "country_code" })
  countryCode?: string | null;

  @Column({
    type: "enum",
    enum: ["football", "handball", "basketball", "volleyball"],
  })
  sport!: "football" | "handball" | "basketball" | "volleyball";

  @Column({
    type: "enum",
    enum: [
      "seniors",
      "u21", "u20", "u19", "u18", "u17", "u16", "u15", "u14", "u13",
      "u12", "u11", "u10", "u9", "u8", "u7",
    ],
    name: "age_category",
  })
  ageCategory!: string;

  @Column({
    type: "enum",
    enum: ["male", "female", "mixed"],
    default: "male",
  })
  gender!: "male" | "female" | "mixed";

  @Column({ type: "varchar", length: 255, nullable: true })
  city?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "city_en" })
  cityEn?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "city_ar" })
  cityAr?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  stadium?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "stadium_ar" })
  stadiumAr?: string | null;

  @Column({ type: "text", nullable: true, name: "logo_url" })
  logoUrl?: string | null;

  @CreateDateColumn({ type: "timestamp", name: "created_at" })
  createdAt!: Date;
}
