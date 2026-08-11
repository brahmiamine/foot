import { Entity, PrimaryColumn, Column } from "typeorm";

/**
 * Mappée sur `User` (table de `sso`), lecture seule, juste pour afficher un
 * nom sur le classement/la communauté — pas de mot de passe ni de rôle ici.
 */
@Entity("User")
export class CommunityUser {
  @PrimaryColumn({ type: "varchar", length: 191 })
  id!: string;

  @Column({ type: "varchar", length: 191 })
  name!: string;
}
