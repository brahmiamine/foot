import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Match } from "./Match";
import type { AgeCategory } from "@/types/categories";

export type NotificationTargetType = "ALL" | "PLAYERS" | "STAFF" | "TEAM_MEMBERS";

/**
 * Notification Entity — communication interne diffusée par le club (message
 * club -> équipe, coach -> joueurs/parents de sa catégorie, direction ->
 * tous, annonce, notification urgente). `category` restreint la diffusion à
 * une catégorie (groupe équipe) ; laissé vide, la notification est
 * club-entier — réservé aux rôles ayant accès à toutes les catégories (voir
 * lib/access.ts / actions.ts), pour empêcher un coach de contacter tout le
 * club. Table propre à cette app, scopée par team_id.
 */
@Entity("cms_notifications")
export class Notification {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "tinyint", default: 0, name: "is_urgent" })
  isUrgent!: boolean;

  @Column({ type: "enum", enum: ["ALL", "PLAYERS", "STAFF", "TEAM_MEMBERS"], default: "ALL", name: "target_type" })
  targetType!: NotificationTargetType;

  @Column({ type: "varchar", length: 10, nullable: true })
  category?: AgeCategory | null;

  @Column({ type: "char", length: 36, nullable: true, name: "match_id" })
  matchId?: string | null;

  @ManyToOne(() => Match, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "match_id" })
  match?: Match | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "created_by" })
  createdBy?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
