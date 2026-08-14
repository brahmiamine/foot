import { Entity, PrimaryColumn, Column } from "typeorm";

/**
 * Mappée sur `Player` (table club-hub, lue par cardManager). Lecture
 * seule ici — la gestion de l'effectif reste dans club-hub.
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

  @Column({ type: "boolean", default: true, name: "isActive" })
  isActive!: boolean;

  @Column({ type: "date", nullable: true, name: "birthDate" })
  birthDate?: Date | null;

  /** GOALKEEPER | DEFENDER | MIDFIELDER | FORWARD */
  @Column({ type: "varchar", length: 50, nullable: true })
  position?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "imageUrl" })
  imageUrl?: string | null;
}
