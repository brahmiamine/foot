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
    enum: ["ADMIN", "OBSERVATEUR", "SUPERADMIN"],
    default: "OBSERVATEUR",
  })
  role!: "ADMIN" | "OBSERVATEUR" | "SUPERADMIN";

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

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;
}