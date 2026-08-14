import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/** Lecture seule de cms_team_members pour valider l'appartenance d'un joueur à la date du match. */
@Entity("cms_team_members")
export class TeamMembership {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 191, nullable: true, name: "player_id" })
  playerId?: string | null;

  @Column({ type: "enum", enum: ["ACTIVE", "SUSPENDED", "ENDED"] })
  status!: "ACTIVE" | "SUSPENDED" | "ENDED";

  @Column({ type: "date", name: "start_date" })
  startDate!: Date;

  @Column({ type: "date", nullable: true, name: "end_date" })
  endDate?: Date | null;
}
