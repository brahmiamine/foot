import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

/**
 * User Entity
 * Mappée sur la table `User` partagée avec cardManager (même base "foot",
 * mêmes comptes). Un compte ADMIN/OBSERVATEUR rattaché à un club peut se
 * connecter aussi bien à cardManager (discipline) qu'à teamManager (site du
 * club) avec les mêmes identifiants — l'accès est scopé par `teamId`.
 * SUPERADMIN (teamId null) n'a pas accès à teamManager.
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
    enum: ["ADMIN", "OBSERVATEUR", "SUPERADMIN"],
    default: "OBSERVATEUR",
  })
  role!: "ADMIN" | "OBSERVATEUR" | "SUPERADMIN";

  @Column({ type: "tinyint" })
  isActive!: boolean;

  @Column({ type: "varchar", length: 191, nullable: true })
  teamId?: string | null;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;
}
