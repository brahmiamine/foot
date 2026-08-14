import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("arbitres")
export class Referee {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 255 })
  nom!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  nom_ar?: string | null;

  @Column({ type: "text", nullable: true })
  photo_url?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  categorie?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  grade?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  nationalite?: string | null;

  @Column({ type: "varchar", length: 50 })
  status!: string;
}
