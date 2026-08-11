import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

/**
 * Invitation d'un membre de staff à rejoindre un club, en 2 temps : un
 * admin déclenche l'invitation (voir src/lib/clubInvitations.ts), la
 * personne invitée choisit elle-même son mot de passe en ouvrant le lien —
 * jamais l'inverse (contrairement à `UserService.create` de `teamManager`,
 * où c'est l'admin qui saisit le mot de passe à la place de la personne).
 * `tokenHash` est le SHA-256 du jeton brut envoyé par email (jamais stocké
 * en clair), même principe que `PasswordResetToken`. Table propre à `sso`,
 * aucune autre app n'y touche (voir db/OWNERSHIP.md).
 */
@Entity("club_invitations")
export class ClubInvitation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 191 })
  email!: string;

  @Column({ type: "varchar", length: 191, name: "team_id" })
  teamId!: string;

  /** Rôle staff attribué à la création du compte — jamais SUPERADMIN/MEMBER via ce flux (voir clubInvitations.ts). */
  @Column({ type: "varchar", length: 20 })
  role!: "ADMIN" | "OBSERVATEUR";

  @Column({ type: "varchar", length: 191, name: "invited_by_user_id" })
  invitedByUserId!: string;

  @Column({ type: "varchar", length: 191, name: "token_hash" })
  tokenHash!: string;

  @Column({ type: "datetime", name: "expires_at" })
  expiresAt!: Date;

  @Column({ type: "datetime", nullable: true, name: "consumed_at" })
  consumedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
