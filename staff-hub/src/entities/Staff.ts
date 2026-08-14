import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type StaffType = "COACH" | "ADJOINT" | "KINE" | "MEDECIN" | "PREPARATEUR" | "ANALYSTE" | "EQUIPEMENTIER" | "COMMUNICATION" | "AUTRE";

/** `cms_staff` (possédée par club-hub), lecture seule — voir club-hub/src/entities/Staff.ts. */
@Entity("cms_staff")
export class Staff {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 100, name: "first_name_fr" })
  firstNameFr!: string;

  @Column({ type: "varchar", length: 100, name: "last_name_fr" })
  lastNameFr!: string;

  @Column({ type: "varchar", length: 255, nullable: true, name: "image_url" })
  imageUrl?: string | null;

  @Column({
    type: "enum",
    enum: ["COACH", "ADJOINT", "KINE", "MEDECIN", "PREPARATEUR", "ANALYSTE", "EQUIPEMENTIER", "COMMUNICATION", "AUTRE"],
    default: "COACH",
    name: "staff_type",
  })
  staffType!: StaffType;

  @Column({ type: "varchar", length: 10, default: "seniors" })
  category!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
