import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Match } from "./Match";
import { Player } from "./Player";
import { User } from "./User";
import { Team } from "./Team";

export type NoteCategory = "TACTICAL" | "DISCIPLINARY" | "MEDICAL" | "OTHER";

/**
 * Note Entity — mappée sur la table `Note`, partagée avec cardManager.
 * Note libre (tactique/disciplinaire/médicale/autre) rattachée à un club,
 * éventuellement à un match et/ou un joueur.
 */
@Entity("Note")
export class Note {
  @PrimaryColumn({ type: "varchar", length: 191 })
  id!: string;

  @Column({ type: "text" })
  contentFr!: string;

  @Column({ type: "text", nullable: true })
  contentAr?: string | null;

  @Column({ type: "enum", enum: ["TACTICAL", "DISCIPLINARY", "MEDICAL", "OTHER"] })
  category!: NoteCategory;

  @Column({ type: "varchar", length: 191, nullable: true })
  matchId?: string | null;

  @ManyToOne(() => Match, { onDelete: "SET NULL" })
  @JoinColumn({ name: "matchId" })
  match?: Match | null;

  @Column({ type: "varchar", length: 191, nullable: true })
  playerId?: string | null;

  @ManyToOne(() => Player, { onDelete: "SET NULL" })
  @JoinColumn({ name: "playerId" })
  player?: Player | null;

  @Column({ type: "varchar", length: 191 })
  authorId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "authorId" })
  author?: User;

  @CreateDateColumn({ type: "datetime", precision: 3 })
  createdAt!: Date;

  /** Une note appartient toujours à une équipe, même sans joueur/match associé. */
  @Column({ type: "varchar", length: 191 })
  teamId!: string;

  @ManyToOne(() => Team)
  @JoinColumn({ name: "teamId" })
  team?: Team;
}
