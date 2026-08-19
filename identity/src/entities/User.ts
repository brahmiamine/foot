import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

/**
 * Mappée sur la table `User` partagée par match-operations/arbinote/federation-hub/
 * club-hub (même base "foot"). Le SSO est le seul endroit qui vérifie un
 * mot de passe : les 5 autres apps (dont `ob`, pour l'espace membre) ne
 * font que valider le cookie de session qu'il émet.
 */
@Entity("User")
export class User {
  @PrimaryColumn({ type: "varchar", length: 191 })
  id!: string;

  @Column({ type: "varchar", length: 191 })
  name!: string;

  /**
   * Profil étendu, optionnel — collecté à l'inscription ou complété plus
   * tard (voir /api/members/me/profile). Distinct de `name` (qui reste le
   * champ d'affichage partout ailleurs) : n'existe que pour satisfaire les
   * champs que Paymee exige à l'initiation d'un paiement
   * (firstName/lastName/phoneNumber), voir ticketing/src/lib/tickets.ts.
   */
  @Column({ type: "varchar", length: 100, nullable: true })
  firstName?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  lastName?: string | null;

  @Column({ type: "varchar", length: 30, nullable: true })
  phoneNumber?: string | null;

  @Column({ type: "varchar", length: 191, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 191 })
  password!: string;

  /**
   * migration.md §7 : rôles cibles PLATFORM_SUPERADMIN/FEDERATION_ADMIN/
   * LEAGUE_ADMIN ajoutés à côté des rôles historiques (compatibilité
   * additive, voir identity/sql/migration_add_federation_league_scope.sql).
   * SUPERADMIN reste émis pour les comptes existants ; les deux valeurs
   * sont interprétées de façon équivalente côté autorisation (voir
   * packages/auth-shared/src/roles.ts, normalizeRole).
   */
  @Column({
    type: "enum",
    enum: [
      "ADMIN",
      "OBSERVATEUR",
      "SUPERADMIN",
      "MEMBER",
      "PLATFORM_SUPERADMIN",
      "FEDERATION_ADMIN",
      "LEAGUE_ADMIN",
      "REFEREE",
      "MATCH_OFFICIAL",
      "REFEREE_OBSERVER",
      "PLAYER",
    ],
    default: "OBSERVATEUR",
  })
  role!:
    | "ADMIN"
    | "OBSERVATEUR"
    | "SUPERADMIN"
    | "MEMBER"
    | "PLATFORM_SUPERADMIN"
    | "FEDERATION_ADMIN"
    | "LEAGUE_ADMIN"
    | "REFEREE"
    | "MATCH_OFFICIAL"
    | "REFEREE_OBSERVER"
    | "PLAYER";

  @Column({ type: "tinyint" })
  isActive!: boolean;

  /** Début inclusif de l'accès temporaire. `null` signifie aucune borne de début. */
  @Column({ type: "datetime", nullable: true, name: "access_valid_from" })
  accessValidFrom?: Date | null;

  /** Fin exclusive de l'accès temporaire. `null` signifie aucune borne de fin. */
  @Column({ type: "datetime", nullable: true, name: "access_valid_until" })
  accessValidUntil?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true })
  teamId?: string | null;

  /**
   * Joueur (club-hub `Player.id`, même base "foot") lié à ce compte —
   * uniquement pour role: "PLAYER", `null` sinon. Permet à player-hub de
   * résoudre l'identité sportive du joueur connecté sans table de liaison
   * séparée (relation 1:1 compte ↔ joueur). Provisionné par le club via
   * scripts/create-player-account.ts, jamais en auto-inscription.
   */
  @Column({ type: "varchar", length: 191, nullable: true, name: "player_id" })
  playerId?: string | null;

  /** Fédération administrée par un compte FEDERATION_ADMIN (migration.md §7-8). `null` pour tout autre rôle. */
  @Column({ type: "varchar", length: 191, nullable: true, name: "federation_id" })
  federationId?: string | null;

  /** Ligue administrée par un compte LEAGUE_ADMIN (migration.md §7-8). `null` pour tout autre rôle. */
  @Column({ type: "varchar", length: 191, nullable: true, name: "league_id" })
  leagueId?: string | null;

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

  /**
   * Révocation de session — voir src/lib/session.ts. Incrémenté à chaque
   * changement de mot de passe, activation/désactivation MFA, modification
   * de la fenêtre d'accès temporaire, ou déconnexion explicite "partout" ;
   * embarqué dans le JWT à l'émission et comparé à cette valeur en base à
   * chaque vérification de session côté Identity.
   */
  @Column({ type: "int", default: 0, name: "token_version" })
  tokenVersion!: number;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;
}