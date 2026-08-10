import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

/**
 * Mappée sur la table `User` partagée par matchsheet/arbinote/superadmin/
 * teamManager (même base "foot"). Le SSO est le seul endroit qui vérifie un
 * mot de passe : les 4 autres apps ne font que valider le cookie de session
 * qu'il émet.
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
