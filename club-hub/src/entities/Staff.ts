import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";
import type { AgeCategory } from "@/types/categories";

/**
 * Staff Entity
 * Table propre à cette app, scopée par team_id vers la table partagée `teams`.
 */
@Entity("cms_staff")
export class Staff {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "bigint", nullable: true, name: "user_id" })
  userId?: number | null;

  @Column({ type: "varchar", length: 100, name: "first_name_fr" })
  firstNameFr!: string;

  @Column({ type: "varchar", length: 100, name: "last_name_fr" })
  lastNameFr!: string;

  @Column({ type: "varchar", length: 100, nullable: true, name: "first_name_ar" })
  firstNameAr?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, name: "last_name_ar" })
  lastNameAr?: string | null;

  @Column({ type: "date", name: "birth_date" })
  birthDate!: Date;

  @Column({ type: "varchar", length: 30, nullable: true })
  phone?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "image_url" })
  imageUrl?: string | null;

  @Column({
    type: "enum",
    enum: ["COACH", "ADJOINT", "KINE", "MEDECIN", "PREPARATEUR", "ANALYSTE", "EQUIPEMENTIER", "COMMUNICATION", "AUTRE"],
    default: "COACH",
    name: "staff_type",
  })
  staffType!: "COACH" | "ADJOINT" | "KINE" | "MEDECIN" | "PREPARATEUR" | "ANALYSTE" | "EQUIPEMENTIER" | "COMMUNICATION" | "AUTRE";

  /** Catégorie interne du club encadrée par ce membre du staff (Seniors, U17...). */
  @Column({ type: "varchar", length: 10, default: "seniors" })
  category!: AgeCategory;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", nullable: true, name: "updated_at" })
  updatedAt?: Date | null;
}
