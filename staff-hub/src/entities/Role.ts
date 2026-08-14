import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

/**
 * `cms_roles` (possédée par club-hub), lecture seule — voir
 * club-hub/src/entities/Role.ts et src/lib/permissions.ts pour le
 * catalogue de clés. staff-hub ne gère jamais les rôles eux-mêmes (ça reste
 * une fonction d'administration réservée à club-hub) : il ne fait que
 * résoudre les permissions effectives de l'utilisateur connecté — voir
 * services/AccessService.ts.
 */
@Entity("cms_roles")
export class Role {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "tinyint", default: 0, name: "is_global" })
  isGlobal!: boolean;

  @Column({ type: "text" })
  permissions!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
