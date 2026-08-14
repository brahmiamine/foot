import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

/**
 * `cms_tactics_boards` (possédée par club-hub), lecture seule — voir
 * club-hub/src/entities/TacticsBoard.ts. staff-hub n'expose qu'une liste
 * consultable (titre/description/catégorie) des planches créées dans
 * club-hub, pas un éditeur graphique — celui-ci reste dans club-hub.
 */
@Entity("cms_tactics_boards")
export class TacticsBoard {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 191, name: "owner_id" })
  ownerId!: string;

  @Column({ type: "varchar", length: 10, nullable: true })
  category?: string | null;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  description?: string | null;

  @Column({ type: "tinyint", default: 0, name: "is_public" })
  isPublic!: boolean;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
