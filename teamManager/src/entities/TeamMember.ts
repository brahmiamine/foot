import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Check } from "typeorm";
import { Team } from "./Team";
import { Player } from "./Player";
import { Staff } from "./Staff";

/**
 * TeamMember Entity
 * Represents the relationship between teams and players/staff
 * Can contain either a player OR a staff member (not both)
 */
@Entity("cms_team_members")
@Check(`(player_id IS NOT NULL AND staff_id IS NULL) OR (player_id IS NULL AND staff_id IS NOT NULL)`)
export class TeamMember {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 191, nullable: true, name: "player_id" })
  playerId?: string | null;

  @ManyToOne(() => Player, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "player_id" })
  player?: Player | null;

  @Column({ type: "bigint", nullable: true, name: "staff_id" })
  staffId?: number | null;

  @ManyToOne(() => Staff, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "staff_id" })
  staff?: Staff | null;

  @Column({
    type: "enum",
    enum: ["ACTIVE", "SUSPENDED", "ENDED"],
    default: "ACTIVE",
  })
  status!: "ACTIVE" | "SUSPENDED" | "ENDED";

  @Column({ type: "date", name: "start_date" })
  startDate!: Date;

  @Column({ type: "date", nullable: true, name: "end_date" })
  endDate?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
