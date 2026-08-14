import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("ligues")
export class League {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 255 })
  nom!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  nom_ar?: string | null;

  @Column({ type: "text", nullable: true })
  logo_url?: string | null;
}
