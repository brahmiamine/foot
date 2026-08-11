import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";

export type ContactDepartment = "GENERAL" | "ADMINISTRATIF" | "SPORTIF" | "ACADEMIE" | "PARTENARIAT";
export type ContactMessageStatus = "NEW" | "READ" | "REPLIED";

/**
 * ContactMessage Entity — message envoyé via le formulaire public /contact.
 * Distincte de la table partagée `contact_messages` (générique, non scopée
 * par club, utilisée par d'autres apps du dépôt).
 */
@Entity("cms_contact_messages")
export class ContactMessage {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 150 })
  name!: string;

  @Column({ type: "varchar", length: 190 })
  email!: string;

  @Column({ type: "varchar", length: 200 })
  subject!: string;

  @Column({ type: "enum", enum: ["GENERAL", "ADMINISTRATIF", "SPORTIF", "ACADEMIE", "PARTENARIAT"], default: "GENERAL" })
  department!: ContactDepartment;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "enum", enum: ["NEW", "READ", "REPLIED"], default: "NEW" })
  status!: ContactMessageStatus;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
