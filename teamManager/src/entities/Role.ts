import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";

/**
 * Role Entity — rôle applicatif propre à un club (ex: "Secrétaire Général",
 * "Coach"), avec un jeu de permissions (clés du catalogue `lib/permissions.ts`)
 * stocké en JSON. `isGlobal` = le rôle donne accès à toutes les catégories
 * (ex: Secrétaire) ; sinon chaque attribution du rôle à un utilisateur
 * (cms_user_roles) précise la catégorie concernée (ex: Coach U17).
 */
@Entity("cms_roles")
export class Role {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  description?: string | null;

  @Column({ type: "tinyint", default: 0, name: "is_global" })
  isGlobal!: boolean;

  @Column({ type: "tinyint", default: 0, name: "is_system" })
  isSystem!: boolean;

  @Column({ type: "text" })
  permissions!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", nullable: true, name: "updated_at" })
  updatedAt?: Date | null;
}
