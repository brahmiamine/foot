import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Role } from "./Role";
import type { AgeCategory } from "@/types/categories";

/** `cms_user_roles` (possédée par club-hub), lecture seule — voir club-hub/src/entities/UserRole.ts. */
@Entity("cms_user_roles")
export class UserRole {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "bigint", name: "role_id" })
  roleId!: number;

  @ManyToOne(() => Role)
  @JoinColumn({ name: "role_id" })
  role!: Role;

  @Column({ type: "varchar", length: 10, nullable: true })
  category?: AgeCategory | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
