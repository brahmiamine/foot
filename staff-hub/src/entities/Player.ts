import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export type PlayerStatus = "TITULAR" | "SUBSTITUTE" | "BLANK" | "ENTERING" | "OUT_OF_LIST" | "SUSPENDED";

/**
 * Copie en lecture seule de `Player` (possédée par club-hub, même base
 * "foot") — voir club-hub/src/entities/Player.ts. Un joueur ne modifie
 * jamais sa propre fiche depuis player-hub (édité par le staff dans
 * club-hub) : aucune écriture sur cette entité ici.
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

  @Column({ type: "varchar", length: 10, default: "seniors" })
  category!: string;

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
  position?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "imageUrl" })
  imageUrl?: string | null;

  @CreateDateColumn({ type: "datetime", name: "createdAt" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updatedAt" })
  updatedAt!: Date;
}
