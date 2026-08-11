import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

/**
 * Mappée sur la table `User` partagée par matchsheet/arbinote/superadmin/
 * teamManager (même base "foot"). Le SSO est le seul endroit qui vérifie un
 * mot de passe : les 5 autres apps (dont `ob`, pour l'espace membre) ne
 * font que valider le cookie de session qu'il émet.
 */
@Entity("User")
export class User {
  @PrimaryColumn({ type: "varchar", length: 191 })
  id!: string;

  @Column({ type: "varchar", length: 191 })
  name!: string;

  @Column({ type: "varchar", length: 191, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 191 })
  password!: string;

  @Column({
    type: "enum",
    enum: ["ADMIN", "OBSERVATEUR", "SUPERADMIN", "MEMBER"],
    default: "OBSERVATEUR",
  })
  role!: "ADMIN" | "OBSERVATEUR" | "SUPERADMIN" | "MEMBER";

  @Column({ type: "tinyint" })
  isActive!: boolean;

  @Column({ type: "varchar", length: 191, nullable: true })
  teamId?: string | null;

  /**
   * MFA (TOTP) — voir src/lib/mfa.ts. `mfaSecret` reste NULL tant que
   * l'enrôlement n'est pas confirmé (voir /api/mfa/enable) : un secret
   * généré mais jamais confirmé par un code valide ne doit jamais pouvoir
   * activer la MFA sur le compte.
   */
  @Column({ type: "varchar", length: 191, nullable: true, name: "mfa_secret" })
  mfaSecret?: string | null;

  @Column({ type: "tinyint", default: 0, name: "mfa_enabled" })
  mfaEnabled!: boolean;

  /** JSON d'un tableau de hash (bcrypt) de codes de récupération à usage unique. */
  @Column({ type: "text", nullable: true, name: "mfa_recovery_codes" })
  mfaRecoveryCodes?: string | null;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;
}
