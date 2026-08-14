import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";

/**
 * ContactInfo Entity — coordonnées du club (page /contact) : adresse,
 * téléphones/emails par département, horaires, carte. Un seul
 * enregistrement par club.
 */
@Entity("cms_contact_info")
export class ContactInfo {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 255, nullable: true, name: "address_fr" })
  addressFr?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "address_ar" })
  addressAr?: string | null;

  @Column({ type: "varchar", length: 30, nullable: true })
  phone?: string | null;

  @Column({ type: "varchar", length: 190, nullable: true })
  email?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "opening_hours_fr" })
  openingHoursFr?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "opening_hours_ar" })
  openingHoursAr?: string | null;

  @Column({ type: "varchar", length: 500, nullable: true, name: "map_embed_url" })
  mapEmbedUrl?: string | null;

  @Column({ type: "varchar", length: 30, nullable: true, name: "admin_phone" })
  adminPhone?: string | null;

  @Column({ type: "varchar", length: 190, nullable: true, name: "admin_email" })
  adminEmail?: string | null;

  @Column({ type: "varchar", length: 30, nullable: true, name: "sport_phone" })
  sportPhone?: string | null;

  @Column({ type: "varchar", length: 190, nullable: true, name: "sport_email" })
  sportEmail?: string | null;

  @Column({ type: "varchar", length: 30, nullable: true, name: "academy_phone" })
  academyPhone?: string | null;

  @Column({ type: "varchar", length: 190, nullable: true, name: "academy_email" })
  academyEmail?: string | null;

  @Column({ type: "varchar", length: 30, nullable: true, name: "partnership_phone" })
  partnershipPhone?: string | null;

  @Column({ type: "varchar", length: 190, nullable: true, name: "partnership_email" })
  partnershipEmail?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at", nullable: true })
  updatedAt?: Date | null;
}
