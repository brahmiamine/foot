import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Check } from "typeorm";
import { Team } from "./Team";
import { Player } from "./Player";
import { Staff } from "./Staff";
import { Season } from "./Season";
import { InternalTeam } from "./InternalTeam";

/**
 * TeamMember Entity
 * Represents the relationship between teams and players/staff.
 * Can contain either a player OR a staff member (not both).
 *
 * Devient progressivement la référence HISTORIQUE d'appartenance :
 * `seasonId` + `internalTeamId` permettent de savoir qu'Ahmed était en
 * U15 A en 2025/26 puis en U17 B en 2026/27 (plusieurs lignes dans le
 * temps), sans jamais perdre l'historique. `Player.category` /
 * `Staff.category` restent la catégorie COURANTE (cache de compatibilité
 * pour le RBAC existant) tant qu'une nouvelle ligne n'est pas créée ici.
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

  @Column({ type: "bigint", nullable: true, name: "season_id" })
  seasonId?: number | null;

  @ManyToOne(() => Season, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "season_id" })
  season?: Season | null;

  @Column({ type: "bigint", nullable: true, name: "internal_team_id" })
  internalTeamId?: number | null;

  @ManyToOne(() => InternalTeam, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "internal_team_id" })
  internalTeam?: InternalTeam | null;

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
