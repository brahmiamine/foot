import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Match } from "./Match";

export type SheetStatus = "DRAFT" | "PRE_MATCH_SIGNED" | "IN_PROGRESS" | "POST_MATCH_SIGNED" | "CLOSED";

/**
 * Sheet Entity — la feuille de match électronique elle-même, une par match.
 * Table propre à l'app matchsheet (ms_sheets).
 */
@Entity("ms_sheets")
export class Sheet {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "match_id" })
  matchId!: string;

  @ManyToOne(() => Match, { onDelete: "CASCADE" })
  @JoinColumn({ name: "match_id" })
  match!: Match;

  @Column({ type: "enum", enum: ["DRAFT", "PRE_MATCH_SIGNED", "IN_PROGRESS", "POST_MATCH_SIGNED", "CLOSED"], default: "DRAFT" })
  status!: SheetStatus;

  @Column({ type: "datetime", nullable: true, name: "pre_match_signed_at" })
  preMatchSignedAt?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "post_match_signed_at" })
  postMatchSignedAt?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "closed_at" })
  closedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at", nullable: true })
  updatedAt?: Date | null;
}
