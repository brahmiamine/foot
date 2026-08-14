import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

/**
 * Jeton de réinitialisation de mot de passe. `tokenHash` est le SHA-256 du
 * jeton brut envoyé par email (jamais stocké en clair) — voir
 * src/lib/passwordReset.ts. Table propre à `sso`, aucune autre app n'y
 * touche (voir db/OWNERSHIP.md).
 */
@Entity("password_reset_tokens")
export class PasswordResetToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "varchar", length: 191, name: "token_hash" })
  tokenHash!: string;

  @Column({ type: "datetime", name: "expires_at" })
  expiresAt!: Date;

  @Column({ type: "datetime", nullable: true, name: "used_at" })
  usedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
