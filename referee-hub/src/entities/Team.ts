import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("teams")
export class Team {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 255, name: "nom" })
  name!: string;

  @Column({ type: "varchar", length: 255, nullable: true, name: "nom_ar" })
  nameAr?: string | null;

  @Column({ type: "varchar", length: 16, nullable: true })
  abbr?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  stadium?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "stadium_ar" })
  stadiumAr?: string | null;

  @Column({ type: "text", nullable: true, name: "logo_url" })
  logoUrl?: string | null;
}
