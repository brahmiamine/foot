import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";

export type PlayerStatus = "TITULAR" | "SUBSTITUTE" | "BLANK" | "ENTERING" | "OUT_OF_LIST" | "SUSPENDED";

/**
 * Player Entity — mappée sur la table `Player`, déjà possédée par cardManager
 * (système disciplinaire : cartons/suspensions/amendes/notes). teamManager
 * est désormais l'endroit où l'on crée/édite les joueurs ; cardManager n'en
 * fait plus que la lecture. `birthDate`/`position`/`imageUrl` sont des
 * colonnes additives propres à la fiche joueur de teamManager, ignorées par
 * le schéma Prisma de cardManager.
 */
@Entity("Player")
export class Player {
  @PrimaryColumn({ type: "varchar", length: 191 })
  id!: string;

  @Column({ type: "varchar", length: 191, name: "firstNameFr" })
  firstNameFr!: string;

  @Column({ type: "varchar", length: 191, nullable: true, name: "firstNameAr" })
  firstNameAr?: string | null;

  @Column({ type: "varchar", length: 191, name: "lastNameFr" })
  lastNameFr!: string;

  @Column({ type: "varchar", length: 191, nullable: true, name: "lastNameAr" })
  lastNameAr?: string | null;

  @Column({ type: "int" })
  number!: number;

  @Column({ type: "varchar", length: 191, name: "teamId" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "teamId" })
  team!: Team;

  @Column({
    type: "enum",
    enum: ["TITULAR", "SUBSTITUTE", "BLANK", "ENTERING", "OUT_OF_LIST", "SUSPENDED"],
    default: "TITULAR",
  })
  status!: PlayerStatus;

  @Column({ type: "boolean", default: true, name: "isActive" })
  isActive!: boolean;

  @Column({ type: "date", nullable: true, name: "birthDate" })
  birthDate?: Date | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  position?: string | null; // GOALKEEPER, DEFENDER, MIDFIELDER, FORWARD

  @Column({ type: "varchar", length: 255, nullable: true, name: "imageUrl" })
  imageUrl?: string | null;

  @CreateDateColumn({ type: "datetime", name: "createdAt" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updatedAt" })
  updatedAt!: Date;
}
