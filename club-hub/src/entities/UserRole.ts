import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";
import { User } from "./User";
import { Role } from "./Role";
import { AgeCategory } from "@/types/categories";

/**
 * UserRole Entity — attribution d'un rôle à un utilisateur du club, avec une
 * catégorie optionnelle (obligatoire en pratique pour les rôles non
 * globaux : un même rôle "Coach" peut être attribué à plusieurs personnes,
 * chacune scopée à sa catégorie).
 */
@Entity("cms_user_roles")
export class UserRole {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "bigint", name: "role_id" })
  roleId!: number;

  @ManyToOne(() => Role, { onDelete: "CASCADE" })
  @JoinColumn({ name: "role_id" })
  role!: Role;

  @Column({ type: "varchar", length: 10, nullable: true })
  category?: AgeCategory | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
