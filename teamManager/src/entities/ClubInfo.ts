import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";

/**
 * ClubInfo Entity — présentation du club (page /club) : qui sommes-nous,
 * valeurs, projet sportif, organisation. Un seul enregistrement par club.
 */
@Entity("cms_club_info")
export class ClubInfo {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "longtext", nullable: true, name: "presentation_fr" })
  presentationFr?: string | null;

  @Column({ type: "longtext", nullable: true, name: "presentation_ar" })
  presentationAr?: string | null;

  @Column({ type: "longtext", nullable: true, name: "values_fr" })
  valuesFr?: string | null;

  @Column({ type: "longtext", nullable: true, name: "values_ar" })
  valuesAr?: string | null;

  @Column({ type: "longtext", nullable: true, name: "sport_project_fr" })
  sportProjectFr?: string | null;

  @Column({ type: "longtext", nullable: true, name: "sport_project_ar" })
  sportProjectAr?: string | null;

  @Column({ type: "longtext", nullable: true, name: "organization_fr" })
  organizationFr?: string | null;

  @Column({ type: "longtext", nullable: true, name: "organization_ar" })
  organizationAr?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at", nullable: true })
  updatedAt?: Date | null;
}
