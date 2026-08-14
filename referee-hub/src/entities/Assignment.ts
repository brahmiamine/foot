import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Match } from "./Match";
import { Referee } from "./Referee";
import { User } from "./User";

export const ASSIGNMENT_ROLES = [
  "CENTER_REFEREE",
  "ASSISTANT_REFEREE",
  "FOURTH_OFFICIAL",
  "MATCH_DELEGATE",
  "REFEREE_OBSERVER",
  "TEAM_REPRESENTATIVE",
] as const;

export type AssignmentRole = (typeof ASSIGNMENT_ROLES)[number];
export type AssignmentStatus = "ACTIVE" | "REVOKED";

@Entity("match_official_assignments")
export class Assignment {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "match_id" })
  matchId!: string;

  @ManyToOne(() => Match, { onDelete: "CASCADE" })
  @JoinColumn({ name: "match_id" })
  match?: Match;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @ManyToOne(() => User, { createForeignKeyConstraints: false })
  @JoinColumn({ name: "user_id" })
  user?: User;

  @Column({ type: "varchar", length: 191, nullable: true, name: "referee_id" })
  refereeId?: string | null;

  @ManyToOne(() => Referee, { nullable: true, createForeignKeyConstraints: false })
  @JoinColumn({ name: "referee_id" })
  referee?: Referee | null;

  @Column({ type: "enum", enum: [...ASSIGNMENT_ROLES] })
  role!: AssignmentRole;

  @Column({ type: "enum", enum: ["ACTIVE", "REVOKED"] })
  status!: AssignmentStatus;

  @CreateDateColumn({ type: "datetime", name: "assigned_at" })
  assignedAt!: Date;

  @Column({ type: "datetime", nullable: true, name: "revoked_at" })
  revokedAt?: Date | null;
}
