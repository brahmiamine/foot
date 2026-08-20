import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

/**
 * User Entity
 * Mappée sur la table `User` partagée avec Identity (même base "foot").
 * Ce mapping reste nécessaire au fallback shared-db de la frontière Identity.
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

  @Column({ type: "datetime", nullable: true, name: "access_valid_from" })
  accessValidFrom?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "access_valid_until" })
  accessValidUntil?: Date | null;

  @Column({ type: "int", default: 0, name: "token_version" })
  tokenVersion!: number;

  @Column({ type: "varchar", length: 191, nullable: true })
  teamId?: string | null;

  /** Identité sportive d'un compte PLAYER, possédée par Identity. */
  @Column({ type: "varchar", length: 191, nullable: true, name: "player_id" })
  playerId?: string | null;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;
}
