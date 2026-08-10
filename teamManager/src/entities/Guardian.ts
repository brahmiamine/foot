import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";
import { User } from "./User";

/**
 * Guardian Entity — parent / responsable légal d'un ou plusieurs joueurs.
 * Jamais rattaché directement au modèle de comptes `User` partagé avec
 * cardManager (aucune connexion requise) ; `userId` reste disponible pour
 * un futur portail parent, optionnel. Table propre à cette app, scopée par
 * team_id.
 */
@Entity("cms_guardians")
export class Guardian {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 100, name: "first_name" })
  firstName!: string;

  @Column({ type: "varchar", length: 100, name: "last_name" })
  lastName!: string;

  @Column({ type: "varchar", length: 30, nullable: true })
  phone?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true })
  email?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  address?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "user_id" })
  userId?: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "user_id" })
  user?: User | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
