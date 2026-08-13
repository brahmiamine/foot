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

  // TASK-P0-023 : verrou optimiste pour les transitions de statut
  // (SheetService.updateStatus/reopen) — deux officiels agissant sur la
  // même feuille en même temps (ex. les deux clôturent/rouvrent) ne
  // s'écrasent plus silencieusement : le second appel dont le
  // `expectedVersion` ne correspond plus à la version en base échoue
  // explicitement (SheetVersionConflictError) au lieu d'écraser le travail
  // du premier. Colonne simple (pas `@VersionColumn`) : l'incrément est géré
  // manuellement dans les seules méthodes à risque, pas sur chaque save()
  // de l'entité (ex. mirrorMatchStatus n'a pas besoin de ce garde-fou).
  @Column({ type: "int", default: 1 })
  version!: number;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at", nullable: true })
  updatedAt?: Date | null;
}
