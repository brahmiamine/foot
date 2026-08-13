import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

export type CorrectableEventType = "GOAL" | "INJURY" | "SUBSTITUTION";
export type CorrectionAction = "CORRECTED" | "CANCELLED";

/**
 * Ledger d'audit append-only (TASK-P0-009) pour toute correction ou
 * annulation d'un événement de match (but/blessure/remplacement) — jamais
 * de suppression silencieuse : une annulation garde la ligne d'origine
 * (voir Goal/Injury/Substitution.cancelledAt) et une correction applique la
 * mise à jour en place, mais l'une comme l'autre écrit ici la valeur
 * avant/après, l'auteur, le motif et la date. `Card` (carton) est
 * volontairement hors périmètre : table partagée avec `teamManager` (voir
 * db/OWNERSHIP.md, « Card a deux écrivains ») — changer sa sémantique de
 * suppression nécessite une décision coordonnée avec ce co-propriétaire.
 */
@Entity("ms_event_corrections")
@Index(["sheetId"])
@Index(["matchId"])
export class MatchEventCorrection {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "sheet_id" })
  sheetId!: number;

  @Column({ type: "char", length: 36, name: "match_id" })
  matchId!: string;

  @Column({ type: "enum", enum: ["GOAL", "INJURY", "SUBSTITUTION"], name: "event_type" })
  eventType!: CorrectableEventType;

  @Column({ type: "bigint", name: "event_id" })
  eventId!: number;

  @Column({ type: "enum", enum: ["CORRECTED", "CANCELLED"] })
  action!: CorrectionAction;

  @Column({ type: "text", name: "before_value" })
  beforeValue!: string;

  @Column({ type: "text", nullable: true, name: "after_value" })
  afterValue?: string | null;

  @Column({ type: "text" })
  reason!: string;

  @Column({ type: "varchar", length: 36, nullable: true, name: "actor_user_id" })
  actorUserId?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "actor_name" })
  actorName?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
