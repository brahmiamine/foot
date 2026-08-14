import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";
import { User } from "./User";
import type { AgeCategory } from "@/types/categories";

/**
 * TacticsBoard Entity — planche tactique d'un coach : exercice / schéma
 * dessiné sur un terrain (joueurs, ballon, plots, flèches...), sauvegardé
 * en JSON dans `content` pour être rechargé et réutilisé pour préparer une
 * séance d'entraînement. Privée par défaut (ownerId) ; visible par les
 * autres membres du club (droit tactics.view) si isPublic. Table propre à
 * cette app, scopée par team_id.
 */
@Entity("cms_tactics_boards")
export class TacticsBoard {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 191, name: "owner_id" })
  ownerId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "owner_id" })
  owner!: User;

  @Column({ type: "varchar", length: 10, nullable: true })
  category?: AgeCategory | null;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  description?: string | null;

  /** JSON: { elements: BoardElement[] } — voir types/tactics.ts */
  @Column({ type: "text" })
  content!: string;

  @Column({ type: "tinyint", default: 0, name: "is_public" })
  isPublic!: boolean;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", nullable: true, name: "updated_at" })
  updatedAt?: Date | null;
}
