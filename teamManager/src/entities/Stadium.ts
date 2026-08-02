import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";

/**
 * Stadium Entity (fiche riche pour le site public : adresse, capacité,
 * photo — le champ `teams.stadium` reste le simple nom affiché ailleurs).
 * Table propre à cette app, scopée par team_id vers la table partagée `teams`.
 */
@Entity("cms_stadiums")
export class Stadium {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 200, name: "name_fr" })
  nameFr!: string;

  @Column({ type: "varchar", length: 200, nullable: true, name: "name_ar" })
  nameAr?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "address_fr" })
  addressFr?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "address_ar" })
  addressAr?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, name: "city_fr" })
  cityFr?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, name: "city_ar" })
  cityAr?: string | null;

  @Column({ type: "boolean", default: false, name: "is_home" })
  isHome!: boolean;

  @Column({ type: "int", nullable: true })
  capacity?: number | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "image_url" })
  imageUrl?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
