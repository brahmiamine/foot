import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

/**
 * Profil communauté (points, blocage, bio) pour un compte de la table
 * `User` partagée (rôle MEMBER en pratique, mais rien n'empêche un
 * ADMIN/SUPERADMIN de participer avec son propre compte). Créée à la
 * volée au premier contact avec une fonctionnalité communauté (voir
 * lib/community/member.ts).
 */
@Entity("ob_members")
export class ObMember {
  @PrimaryColumn({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "int", default: 0 })
  points!: number;

  @Column({ type: "tinyint", name: "is_blocked" })
  isBlocked!: boolean;

  @Column({ type: "text", nullable: true })
  bio?: string | null;

  @Column({ type: "text", nullable: true, name: "avatar_url" })
  avatarUrl?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
