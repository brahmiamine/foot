import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";

export type ApplicationStatus = "NEW" | "CONTACTED" | "TRIAL" | "ACCEPTED" | "REJECTED";

/**
 * PlayerApplication Entity — candidature "Inscrire mon enfant" soumise via
 * le formulaire public /inscription. Traitée ensuite côté admin
 * (changement de statut NEW -> CONTACTED -> TRIAL -> ACCEPTED/REJECTED).
 */
@Entity("cms_player_applications")
export class PlayerApplication {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 100, name: "child_last_name" })
  childLastName!: string;

  @Column({ type: "varchar", length: 100, name: "child_first_name" })
  childFirstName!: string;

  @Column({ type: "date", name: "birth_date" })
  birthDate!: string;

  @Column({ type: "varchar", length: 20 })
  category!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  position?: string | null;

  @Column({ type: "varchar", length: 150, name: "parent_name" })
  parentName!: string;

  @Column({ type: "varchar", length: 30, name: "parent_phone" })
  parentPhone!: string;

  @Column({ type: "varchar", length: 190, name: "parent_email" })
  parentEmail!: string;

  @Column({ type: "text", nullable: true })
  message?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "document_url" })
  documentUrl?: string | null;

  @Column({ type: "enum", enum: ["NEW", "CONTACTED", "TRIAL", "ACCEPTED", "REJECTED"], default: "NEW" })
  status!: ApplicationStatus;

  @Column({ type: "text", nullable: true, name: "admin_notes" })
  adminNotes?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at", nullable: true })
  updatedAt?: Date | null;
}
