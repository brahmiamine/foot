import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Season } from "./Season";

@Entity("journees")
export class Matchday {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "char", length: 36, name: "saison_id" })
  seasonId!: string;

  @ManyToOne(() => Season, { onDelete: "CASCADE" })
  @JoinColumn({ name: "saison_id" })
  season?: Season;

  @Column({ type: "int", nullable: true, name: "numero" })
  number?: number | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "nom_fr" })
  nameFr?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "nom_ar" })
  nameAr?: string | null;
}
