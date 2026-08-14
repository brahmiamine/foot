import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { League } from "./League";

@Entity("saisons")
export class Season {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 255 })
  nom!: string;

  @Column({ type: "enum", enum: ["championnat", "coupe", "tournois"] })
  type_competition!: "championnat" | "coupe" | "tournois";

  @Column({ type: "char", length: 36, nullable: true, name: "league_id" })
  leagueId?: string | null;

  @ManyToOne(() => League, { nullable: true })
  @JoinColumn({ name: "league_id" })
  league?: League | null;
}
