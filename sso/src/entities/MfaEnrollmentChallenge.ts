import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

/**
 * Secret TOTP en attente de confirmation, entre /api/mfa/setup et
 * /api/mfa/enable (voir src/lib/mfa.ts). Une ligne par utilisateur (PK =
 * userId) : un nouvel appel à /setup remplace la tentative précédente.
 * Remplace le round-trip client (secret renvoyé par /setup puis reposté
 * vers /enable) — le serveur reste seul à connaître le secret entre les
 * deux appels, avec une expiration courte. Table propre à `sso` (voir
 * db/OWNERSHIP.md).
 */
@Entity("mfa_enrollment_challenges")
export class MfaEnrollmentChallenge {
  @PrimaryColumn({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "varchar", length: 191 })
  secret!: string;

  @Column({ type: "datetime", name: "expires_at" })
  expiresAt!: Date;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
