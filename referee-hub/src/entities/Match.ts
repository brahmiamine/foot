import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Matchday } from "./Matchday";
import { Team } from "./Team";

@Entity("matches")
export class Match {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "char", length: 36, name: "journee_id" })
  matchdayId!: string;

  @ManyToOne(() => Matchday, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "journee_id" })
  matchday?: Matchday;

  @Column({ type: "char", length: 36, name: "equipe_home" })
  homeTeamId!: string;

  @ManyToOne(() => Team, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "equipe_home" })
  homeTeam?: Team;

  @Column({ type: "char", length: 36, name: "equipe_away" })
  awayTeamId!: string;

  @ManyToOne(() => Team, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "equipe_away" })
  awayTeam?: Team;

  @Column({ type: "datetime", nullable: true })
  date?: Date | null;

  @Column({ type: "enum", enum: ["UPCOMING", "IN_PROGRESS", "FINISHED", "CANCELLED"] })
  status!: "UPCOMING" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";
}
